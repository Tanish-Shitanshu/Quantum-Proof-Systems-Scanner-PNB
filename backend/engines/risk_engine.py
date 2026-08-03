def calculate_advanced_risk(
    tls_versions: list,
    algorithm: str,
    key_size: int,
    days_to_expiry: int,
    vulnerabilities: list,
    hosting: dict,
    has_owner: bool = True,
    pqc_kem_detected: bool = False,
    pqc_status: str = "None",
    exposure_context: dict | None = None,
) -> dict:
    """
    PQC-centric 6-factor weighted penalty model (v3).

    Factors and weights:
      1. KEM / Key Exchange  35%  — primary quantum threat ("harvest now, decrypt later")
      2. Certificate Algo    25%  — authentication quantum threat
      3. Protocol Version    15%  — TLS 1.3 required for PQC KEMs
      4. Certificate Health  10%  — operational cert expiry risk
      5. Vulnerabilities     10%  — active web security findings (false-positive hardened)
      6. Exposure             5%  — public attack surface

    Score = 100 − weighted_penalty.  Higher = safer.
    """
    adjustments = []
    pqc_status_upper = (pqc_status or "None").upper()
    algo_upper = (algorithm or "Unknown").upper()

    has_1_3 = any("1.3" in t for t in tls_versions)
    has_1_2 = any("1.2" in t for t in tls_versions)
    has_legacy = any("1.1" in t or "1.0" in t for t in tls_versions)

    weights = {
        "kem":         0.35,
        "cert_algo":   0.25,
        "protocol":    0.15,
        "cert_health": 0.10,
        "vulnerability": 0.10,
        "exposure":    0.05,
    }

    # ── Factor 1: KEM / Key Exchange (35%) ──────────────────────────────────
    # This is the single most important factor for quantum safety.
    # "Harvest now, decrypt later" — attackers record TLS traffic today and
    # decrypt it once a quantum computer is available.  A PQC KEM makes all
    # recorded sessions permanently unreadable.
    if pqc_kem_detected:
        if "FULL" in pqc_status_upper:
            kem_risk = 0
            adjustments.append("KEM: Full PQC — session key is quantum-safe")
        else:
            # Hybrid PQC: quantum-safe KEM + classical fallback.  Excellent posture.
            kem_risk = 5
            adjustments.append("KEM: Hybrid PQC — session key is quantum-safe")
    else:
        kem_risk = 100
        adjustments.append("KEM: Classical only — vulnerable to harvest-now-decrypt-later")

    # ── Factor 2: Certificate Algorithm (25%) ───────────────────────────────
    # The certificate algorithm protects authentication.  A quantum computer
    # running Shor's algorithm can forge RSA/ECC signatures, impersonate servers,
    # and issue fraudulent certificates.
    pqc_cert_keywords = ("dilithium", "falcon", "sphincs", "ml-dsa", "mldsa", "slh-dsa")
    cert_is_pqc = any(k in algo_upper.lower() for k in pqc_cert_keywords)

    if cert_is_pqc:
        cert_algo_risk = 0
        adjustments.append("Cert algo: PQC signature — authentication is quantum-safe")
    elif algo_upper == "RSA":
        cert_algo_risk = 60
        if key_size < 2048:
            cert_algo_risk += 40
        elif key_size <= 2048:
            cert_algo_risk += 20
        # RSA > 2048 gets no extra penalty — larger RSA is harder classically but still quantum-broken
        cert_algo_risk = min(100, cert_algo_risk)
    elif algo_upper in ("ECC", "ECDSA", "EC"):
        cert_algo_risk = 30
        if key_size < 224:
            cert_algo_risk += 40
        elif key_size < 256:
            cert_algo_risk += 20
        cert_algo_risk = min(100, cert_algo_risk)
    else:
        cert_algo_risk = 20  # Unknown algorithm — mild penalty

    # ── Factor 3: Protocol Version (15%) ────────────────────────────────────
    # TLS 1.3 is the only version that supports PQC KEMs and mandates
    # forward secrecy.  Presence of TLS 1.2 creates downgrade risk.
    if has_legacy:
        protocol_risk = 100
    elif has_1_3 and has_1_2:
        protocol_risk = 10   # TLS 1.3 available; 1.2 is minor downgrade risk
    elif has_1_2:
        protocol_risk = 50
    elif has_1_3:
        protocol_risk = 0
    else:
        protocol_risk = 60   # Unknown / no TLS detected

    # ── Factor 4: Certificate Health (10%) ──────────────────────────────────
    # An expiring or expired certificate causes outages and forces emergency
    # renewal — a poor operational security posture.
    days = days_to_expiry if isinstance(days_to_expiry, int) else 9999
    if days < 0:
        cert_health_risk = 100
        adjustments.append("Cert health: EXPIRED — certificate is no longer valid")
    elif days < 7:
        cert_health_risk = 90
    elif days < 30:
        cert_health_risk = 70
        adjustments.append(f"Cert health: expiring in {days} days — urgent renewal needed")
    elif days < 90:
        cert_health_risk = 40
    elif days < 180:
        cert_health_risk = 10
    else:
        cert_health_risk = 0

    # ── Factor 5: Vulnerabilities (10%) ─────────────────────────────────────
    # Only high-confidence confirmed findings are scored.
    # Response-reflection alone is NOT treated as confirmed SQLi (false-positive
    # prone on WAF-protected banking sites that echo back form inputs).
    vuln_risk = 0
    for v in (vulnerabilities or []):
        v_type = (v.get("type") or "").upper()
        confidence = (v.get("confidence") or "medium").lower()
        if confidence == "low":
            continue
        if "SQL" in v_type and "INJECTION" in v_type:
            evidence = (v.get("evidence") or "").lower()
            # Only count confirmed SQLi with real database error signals.
            if any(sig in evidence for sig in ("database error", "sql syntax", "mysql", "ora-", "psql", "odbc")):
                vuln_risk = max(vuln_risk, 80)
        elif "XSS" in v_type or "CROSS-SITE" in v_type:
            vuln_risk = max(vuln_risk, 40)
        elif "REDIRECT" in v_type or "SSRF" in v_type:
            vuln_risk = max(vuln_risk, 30)
    vuln_risk = min(100, vuln_risk)

    # ── Factor 6: Exposure (5%) ──────────────────────────────────────────────
    exposure_context = exposure_context or {}
    public_target = bool(exposure_context.get("public_target", False))
    active_subdomains = int(exposure_context.get("active_subdomains", 0) or 0)
    base_exposure = 45 if public_target else 25
    exposure_risk = int(min(100, base_exposure + min(active_subdomains * 0.5, 15)))

    # ── Weighted penalty sum ─────────────────────────────────────────────────
    total_penalty = (
        weights["kem"]           * kem_risk +
        weights["cert_algo"]     * cert_algo_risk +
        weights["protocol"]      * protocol_risk +
        weights["cert_health"]   * cert_health_risk +
        weights["vulnerability"] * vuln_risk +
        weights["exposure"]      * exposure_risk
    )

    score_pre_overrides = int(max(0, 100 - total_penalty))
    score = score_pre_overrides

    # PQC floor: a site actively doing PQC KEM is never labelled Critical.
    if pqc_kem_detected:
        if "FULL" in pqc_status_upper:
            floor = 80
        else:
            floor = 68
        if score < floor:
            adjustments.append(f"Score floor applied to {floor} — PQC KEM active ({pqc_status})")
            score = floor

    # Hard cap: expired certificate is always Critical regardless of KEM.
    if days < 0:
        score = min(score, 15)
        adjustments.append("Score capped to 15 — expired certificate")

    # ── Classification ───────────────────────────────────────────────────────
    if score >= 80:
        risk_level, status, label, category = "Low",      "Secure",      "PQC Ready",      "Elite PQC"
    elif score >= 60:
        risk_level, status, label, category = "Medium",   "Partial",     "Quantum Safe",   "Standard"
    elif score >= 40:
        risk_level, status, label, category = "High",     "Vulnerable",  "Needs Upgrade",  "Transitional"
    else:
        risk_level, status, label, category = "Critical", "Vulnerable",  "Not Safe",       "Critical"

    # ── Baseline for improvement% ────────────────────────────────────────────
    baseline_score = 100 if not has_legacy else 30
    improvement = f"+{int(((baseline_score - score) / baseline_score) * 100)}%" if baseline_score > score else "+0%"

    # ── Human-readable insight ────────────────────────────────────────────────
    top_factors = sorted(
        [("KEM",           kem_risk           * weights["kem"]),
         ("Certificate",   cert_algo_risk     * weights["cert_algo"]),
         ("Protocol",      protocol_risk      * weights["protocol"]),
         ("Cert Expiry",   cert_health_risk   * weights["cert_health"]),
         ("Vulnerability", vuln_risk          * weights["vulnerability"]),
         ("Exposure",      exposure_risk      * weights["exposure"])],
        key=lambda x: x[1], reverse=True
    )
    top_driver = top_factors[0][0]

    pqc_note = f"PQC KEM active: {pqc_status}." if pqc_kem_detected else "No PQC KEM detected — session keys can be harvested now and decrypted by future quantum computers."
    protocol_desc = ("TLS 1.3 + 1.2" if (has_1_3 and has_1_2) else
                     "TLS 1.3" if has_1_3 else
                     "TLS 1.2" if has_1_2 else "Legacy TLS")
    reason_text = (
        f"PQC-centric 6-factor model (v3). "
        f"Primary penalty driver: {top_driver}. "
        f"{pqc_note} "
        f"Protocol: {protocol_desc}. "
        f"Cert: {algorithm} {key_size}-bit, {days if days >= 0 else 'EXPIRED'} days to expiry."
    )

    reco_parts = []
    if not pqc_kem_detected:
        reco_parts.append("Enable X25519MLKEM768 hybrid KEM (FIPS 203) on TLS 1.3 endpoints to protect against harvest-now-decrypt-later attacks.")
    if has_legacy:
        reco_parts.append("Disable TLS 1.0 and 1.1 immediately — they are broken protocols.")
    if not has_1_3:
        reco_parts.append("Upgrade all endpoints to TLS 1.3.")
    if days < 30 and days >= 0:
        reco_parts.append(f"Certificate expires in {days} days — renew immediately.")
    if days < 0:
        reco_parts.append("Certificate has expired — renew immediately, service is untrusted.")
    if algo_upper == "RSA" and not cert_is_pqc:
        reco_parts.append("Plan ahead: migrate to ML-DSA (FIPS 204) certificate when your CA supports it.")
    if not reco_parts:
        reco_parts.append("Strong PQC posture. Monitor NIST FIPS 203/204/205 for updates and re-evaluate annually.")

    return {
        "score": score,
        "score_pre_overrides": score_pre_overrides,
        "total_penalty": round(total_penalty, 2),
        "risk_level": risk_level,
        "status": status,
        "label": label,
        "category": category,
        "pqc_status": pqc_status,
        "pqc_kem_detected": pqc_kem_detected,
        "formula_version": "v3-pqc-centric",
        "weights": weights,
        "components": {
            "kem":           kem_risk,
            "cert_algo":     cert_algo_risk,
            "protocol":      protocol_risk,
            "cert_health":   cert_health_risk,
            "vulnerability": vuln_risk,
            "exposure":      exposure_risk,
        },
        "adjustments": adjustments,
        "baseline_score": baseline_score,
        "improvement": improvement,
        "reason": reason_text,
        "recommendation": " ".join(reco_parts),
    }

    adjustments = []
    
    # 1. Crypto Risk (max 100)
    crypto_risk = 0
    algo_upper = algorithm.upper()
    if algo_upper == "RSA":
        crypto_risk += 60 # High risk for quantum
    elif algo_upper in ["ECC", "ECDSA"]:
        crypto_risk += 30
    
    if algo_upper == "RSA":
        if key_size < 2048:
            crypto_risk += 40
        elif key_size == 2048:
            crypto_risk += 20
    elif algo_upper in ["ECC", "ECDSA"]:
        # ECC uses smaller key sizes with equivalent security levels.
        if key_size < 224:
            crypto_risk += 40
        elif key_size < 256:
            crypto_risk += 20
    else:
        if key_size < 2048:
            crypto_risk += 40
        
    crypto_risk = min(100, crypto_risk)

    # Reward endpoints already negotiating PQC KEMs.
    pqc_status_upper = (pqc_status or "None").upper()
    if pqc_kem_detected:
        if "FULL" in pqc_status_upper:
            crypto_risk = max(0, crypto_risk - 45)
            adjustments.append("Crypto risk reduced by 45 for Full PQC KEM negotiation")
        elif "HYBRID" in pqc_status_upper:
            crypto_risk = max(0, crypto_risk - 35)
            adjustments.append("Crypto risk reduced by 35 for Hybrid PQC KEM negotiation")

    # 2. Protocol Risk (max 100)
    protocol_risk = 0
    has_1_3 = any("1.3" in t for t in tls_versions)
    has_1_2 = any("1.2" in t for t in tls_versions)
    has_legacy = any("1.1" in t or "1.0" in t for t in tls_versions)
    
    if has_legacy:
        protocol_risk = 100
    elif has_1_3 and has_1_2:
        # TLS 1.3 is available (best protocol) but 1.2 fallback exists → minor downgrade risk only.
        # Must always score better than TLS 1.2-only (50). Penalising it above 50 is wrong.
        protocol_risk = 15
    elif has_1_2:
        protocol_risk = 50
    elif has_1_3:
        protocol_risk = 0

    if pqc_kem_detected:
        if "FULL" in pqc_status_upper:
            protocol_risk = max(0, protocol_risk - 20)
            adjustments.append("Protocol risk reduced by 20 for Full PQC KEM negotiation")
        elif "HYBRID" in pqc_status_upper:
            protocol_risk = max(0, protocol_risk - 12)
            adjustments.append("Protocol risk reduced by 12 for Hybrid PQC KEM negotiation")

    # 3. Vulnerability Risk (max 100)
    vuln_risk = 0
    for v in vulnerabilities:
        v_type = v.get("type", "").upper()
        if "SQLI" in v_type or "SQL INJECTION" in v_type:
            vuln_risk = max(vuln_risk, 100)
        elif "XSS" in v_type:
            vuln_risk = max(vuln_risk, 50)

    # 4. Exposure Risk (max 100)
    # Lightweight dynamic heuristic to avoid static scoring while keeping behavior stable.
    exposure_context = exposure_context or {}
    public_target = bool(exposure_context.get("public_target", False))
    active_subdomains = int(exposure_context.get("active_subdomains", 0) or 0)
    high_sev_vulns = int(exposure_context.get("high_severity_vuln_count", 0) or 0)

    hosting_type = str((hosting or {}).get("type", "")).lower()
    base_exposure = 45 if public_target else 25
    if hosting_type == "third_party":
        base_exposure += 5

    exposure_risk = base_exposure
    exposure_risk += min(active_subdomains * 0.5, 15)
    exposure_risk += min(high_sev_vulns * 3, 15)
    exposure_risk = int(max(0, min(100, round(exposure_risk))))

    # 5. Third Party Risk (max 100)
    third_party_risk = 100 if hosting.get("type") == "third_party" else 0
    
    # 6. Governance Risk (max 100)
    gov_risk = 0 if has_owner else 100

    # CALCULATE FINAL SCORE
    total_penalty = (
        weights["crypto"] * crypto_risk +
        weights["protocol"] * protocol_risk +
        weights["vulnerability"] * vuln_risk +
        weights["exposure"] * exposure_risk +
        weights["third_party"] * third_party_risk +
        weights["governance"] * gov_risk
    )

    score_pre_overrides = int(max(0, 100 - total_penalty))
    score = score_pre_overrides

    # PQC-aware floor: if endpoint already negotiates PQC KEM, avoid classifying as overly critical.
    if pqc_kem_detected:
        if "FULL" in pqc_status_upper:
            floor = 72
            if score < floor:
                adjustments.append("Score floor applied to 72 for Full PQC endpoint")
            score = max(score, floor)
        elif "HYBRID" in pqc_status_upper:
            floor = 65
            if score < floor:
                adjustments.append("Score floor applied to 65 for Hybrid PQC endpoint")
            score = max(score, floor)
    
    # Certificate expiry overrides
    if days_to_expiry < 0:
        if score > 10:
            adjustments.append("Expired certificate cap applied: score limited to 10")
        score = min(score, 10)
        
    # CLASSIFICATION ENGINE
    if score >= 80:
        category = "Elite PQC"
        risk_level = "Low"
        status = "Secure"
        label = "PQC Ready"
    elif score >= 60:
        category = "Standard"
        risk_level = "Medium"
        status = "Partial"
        label = "Quantum Safe"
    elif score >= 40:
        category = "Transitional"
        risk_level = "High"
        status = "Vulnerable"
        label = "Needs Upgrade"
    else:
        category = "Critical"
        risk_level = "Critical"
        status = "Vulnerable"
        label = "Not Safe"
        
    # COMPETITIVE SCORING
    baseline_score = 100
    if has_legacy:
        baseline_score = 30
    elif has_1_2:
        baseline_score = 70
        
    improvement = f"+{int(((baseline_score - score) / baseline_score) * 100)}%" if baseline_score > score else "+34%"

    # Build meaningful reason / recommendation strings from actual factor values.
    top_factors = sorted(
        [("Crypto", crypto_risk * weights["crypto"]),
         ("Protocol", protocol_risk * weights["protocol"]),
         ("Vulnerability", vuln_risk * weights["vulnerability"]),
         ("Exposure", exposure_risk * weights["exposure"]),
         ("Third-Party", third_party_risk * weights["third_party"]),
         ("Governance", gov_risk * weights["governance"])],
        key=lambda x: x[1], reverse=True
    )
    top_driver = top_factors[0][0] if top_factors else "Crypto"
    pqc_note = f" PQC KEM negotiated ({pqc_status})." if pqc_kem_detected else " No PQC KEM detected."
    protocol_note = (
        "TLS 1.3+1.2 (minor downgrade risk)" if (has_1_3 and has_1_2) else
        "TLS 1.3 only" if has_1_3 else
        "TLS 1.2 only" if has_1_2 else
        "Legacy TLS (1.0/1.1)"
    )
    reason_text = (
        f"6-factor weighted penalty model. Primary driver: {top_driver} risk. "
        f"Protocol: {protocol_note}.{pqc_note} "
        f"Algorithm: {algorithm} {key_size}-bit."
    )
    reco_parts = []
    if not pqc_kem_detected:
        reco_parts.append("Enable ML-KEM / X25519MLKEM768 hybrid KEM on TLS 1.3 endpoints.")
    if has_legacy:
        reco_parts.append("Disable TLS 1.0/1.1 immediately.")
    if not has_1_3:
        reco_parts.append("Upgrade to TLS 1.3.")
    if algo_upper == "RSA" and not pqc_kem_detected:
        reco_parts.append("Plan migration from RSA to ML-DSA or hybrid PQC certificate.")
    if not reco_parts:
        reco_parts.append("Maintain current PQC posture and monitor for NIST FIPS 203/204/205 updates.")
    recommendation_text = " ".join(reco_parts)

    return {
        "score": score,
        "score_pre_overrides": score_pre_overrides,
        "total_penalty": round(total_penalty, 2),
        "risk_level": risk_level,
        "status": status,
        "label": label,
        "category": category,
        "pqc_status": pqc_status,
        "pqc_kem_detected": pqc_kem_detected,
        "formula_version": "v2-6factor-weighted-penalty",
        "weights": weights,
        "components": {
            "crypto": crypto_risk,
            "protocol": protocol_risk,
            "vulnerability": vuln_risk,
            "exposure": exposure_risk,
            "third_party": third_party_risk,
            "governance": gov_risk,
        },
        "adjustments": adjustments,
        "baseline_score": baseline_score,
        "improvement": improvement,
        "reason": reason_text,
        "recommendation": recommendation_text,
    }

