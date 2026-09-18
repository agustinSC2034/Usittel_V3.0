<?php
// COPY OUTSIDE the repository/public directory. Never put real secrets here.
return [
    'mode' => 'phantom', // demo | phantom; server only
    'phantom_auth_mode' => 'get-query-lab', // explicit GET auth; all reads remain POST
    'customer_id_field' => null, // set ID or IDAx only AFTER the identity check is reviewed
    'phantom_url' => 'https://phantom.usittel.com.ar/PHANTOM/Includes/API_Rest.php',
    'api_user' => '',
    'api_pass' => '',
    'allowed_idas' => [1], // The portal is restricted to IDA 1 even if an older config includes 5.
    'lab_users' => [], // e.g. 'actual-custom-username' => 1. NO passwords.
    'idle_seconds' => 900,
    'max_seconds' => 28800,
    'timeout_seconds' => 10,
    'connect_timeout_seconds' => 4,
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
];
