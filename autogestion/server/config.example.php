<?php
// COPY OUTSIDE the repository/public directory. Never put real secrets here.
return [
    'mode' => 'phantom', // demo | phantom; server only
    'phantom_url' => 'https://phantom.usittel.com.ar/PHANTOM/Includes/API_Rest.php',
    'api_user' => '',
    'api_pass' => '',
    'allowed_idas' => [1, 5], // This delivery only accepts a subset of 1 and 5.
    'lab_users' => [], // e.g. 'actual-custom-username' => 1. NO passwords.
    'idle_seconds' => 900,
    'max_seconds' => 28800,
    'timeout_seconds' => 10,
    'connect_timeout_seconds' => 4,
    // Confirm against a controlled response before enabling optional mappings.
    // Paths are arrays of exact JSON keys, not expressions. [] = response root.
    // For compound display text: ['join'=>[['ConfirmedKey'],['OtherConfirmedKey']]].
    // Those names are syntax examples, NOT verified Phantom fields.
    'customer_path' => [],
    'profile_fields' => [
        'name' => null, 'address' => null, 'plan' => null,
        'city' => null, 'email' => null, 'phone' => null,
    ],
    // Set only after confirming the numeric JSON field for the documented
    // credit-minus-debit balance. null => unavailable, no balance query.
    'balance_path' => null,
    // Optional CA bundle absolute path; certificate validation is NEVER disabled.
    'ca_file' => null,
];
