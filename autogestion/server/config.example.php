<?php
// COPY OUTSIDE the repository/public directory. Never put real secrets here.
return [
    'mode' => 'phantom', // demo | phantom; server only
    'phantom_auth_mode' => 'get-query-lab', // explicit GET auth; all reads remain POST
    'customer_id_field' => null, // set ID or IDAx only AFTER the identity check is reviewed
    'phantom_url' => 'https://phantom.usittel.com.ar/PHANTOM/Includes/API_Rest.php',
    'api_user' => '',
    'api_pass' => '',
    'allowed_idas' => [1], // Legacy lab scope; initial login is configured below, associated services are server-authorized.
    // Optional initial login candidates AFTER the safe service inspection is reviewed.
    // This does not authorize associated contracts by itself; exact credentials still required.
    'service_login_idas' => [1], // Use 'all' to allow any numeric contract username or private lab_users mapping; exact credentials remain required.
    'lab_users' => [], // e.g. 'actual-custom-username' => 1. NO passwords.
    'idle_seconds' => 900,
    'max_seconds' => 28800,
    'timeout_seconds' => 10,
    'connect_timeout_seconds' => 4,
    // Optional, after validating actual product fields; see MI-SERVICIO.md.
    'service_product_fields' => [],
    // HTTPS base containing LibreSpeed garbage.php/empty.php; never localhost.
    'speedtest_server' => null,
    // Controlled Wi-Fi trial only. Exact models from a read-only inspection.
    // SSID/SSID_5G/Password in JSON body; confirm this contract in the first trial.
    'wifi' => ['enabled'=>false, 'lab_ida'=>null, 'models'=>[], 'dual_band_models'=>[]],
    // Read-only SOAP inspection, separate from any upgrade permission. See SERVICE-OPERATIONS.md.
    'soap' => ['read_enabled'=>false,'lab_ida'=>null,'url'=>null,'profile_names'=>[],'profile_ids'=>[]],
    // No production upgrade writer exists until billing + provisioning are demonstrated.
    'upgrade' => ['enabled'=>false,'lab_ida'=>null,'plans'=>[]],
    // Category/state names and no-ticket response MUST be confirmed in this installation.
    'tickets' => ['enabled'=>false,'lab_ida'=>null,'clear_response'=>null,'products'=>[]],
    // Event outbox only; no delivery adapter is connected in this stage.
    'notifications' => ['email_enabled'=>false,'botmaker_enabled'=>false],
    // null uses the explicit laboratory mappings (see INTEGRATION.md).
    // Optional overrides are exact public paths, never credential fields.
    'profile_fields' => [
        'name' => null, 'address' => null, 'plan' => null,
        'city' => null, 'email' => null, 'phone' => null,
    ],
    // Balance always comes from Phantom_Mi_Estado_Cuenta.Balance.
    // Legacy customer_path/balance_path settings no longer select records or balances.
    // Optional CA bundle absolute path; certificate validation is NEVER disabled.
    'ca_file' => null,
    // Optional lab SIRO. Add privately, never overwrite an existing config.
    'siro' => [
        'enabled' => false,
        // Explicit single-service laboratory account. Never hides associated services.
        'lab_ida' => 1,
        'user' => '', 'password' => '',
        'return_base' => 'http://127.0.0.1:4174/autogestion',
        // Explicit unused five-digit suffix range reserved for this CPE/integration.
        // Do not guess or overlap Phantom/Botmaker/previous POC sequences.
        'receipt_start' => null, 'receipt_end' => null,
    ],
    // Separate, explicit laboratory gate for the irreversible Phantom write.
    // Enable only after the read-only CRM check and controlled fixtures pass.
    'phantom_posting' => [
        'enabled' => false,
        'lab_ida' => 1,
        'crm_url' => 'https://phantom.usittel.com.ar/PHANTOM/Includes/CRM/API_CRM.php',
        'origin' => 'SIRO Mi USITTEL',
    ],
];
