<?php
// COPY OUTSIDE the repository/public directory. Never put real secrets here.
return [
    'mode' => 'phantom', // demo | phantom; server only
    'phantom_auth_mode' => 'get-query-lab', // explicit GET auth; all reads remain POST
    'customer_id_field' => null, // set ID or IDAx only AFTER the identity check is reviewed
    'phantom_url' => 'https://phantom.usittel.com.ar/PHANTOM/Includes/API_Rest.php',
    'api_user' => '',
    'api_pass' => '',
    // Portal authorization: every positive numeric contract can be a login candidate.
    // Phantom credentials must match exactly; only server-discovered contracts enter the session.
    // Optional aliases are for confirmed non-numeric usernames only. Never store passwords here.
    'login_users' => [], // e.g. 'confirmed-username' => 1234
    // Legacy CLI inspectors only. This list does NOT restrict portal login or PDFs.
    'allowed_idas' => [1],
    'idle_seconds' => 900,
    'max_seconds' => 28800,
    'timeout_seconds' => 10,
    'connect_timeout_seconds' => 4,
    // Confirmed public fields. null and [] retain different meanings; see MI-SERVICIO.md.
    'service_product_fields' => ['Productos_Television','Productos_Otros'],
    // Exact aliases confirmed from Phantom product selection; private config is updated manually.
    'service_catalog' => [
        'sensa' => ['type'=>'sensa','public_name'=>'Sensa','aliases'=>[]],
        'pack_futbol' => ['type'=>'sensa_pack','public_name'=>'Pack Fútbol','aliases'=>['Pack Futbol']],
        'pack_hbo' => ['type'=>'sensa_pack','public_name'=>'Pack HBO','aliases'=>['HBO']],
        'pack_universal' => ['type'=>'sensa_pack','public_name'=>'Universal+','aliases'=>['Universal+']],
        'stb' => ['type'=>'stb','public_name'=>'Set Top Box','aliases'=>['Set Top Box']],
        'mesh' => ['type'=>'mesh','public_name'=>'Wi-Fi Mesh','aliases'=>['USITTEL MESH']],
    ],
    // Public prices verified on usittel.com.ar on 2026-09-23. Offers remain
    // conservative: offers require configured exact aliases or structural evidence.
    'commercial_catalog' => [
        ['id'=>'sensa','type'=>'sensa','public_name'=>'Sensa','description'=>'Más de 100 canales en vivo y contenido on-demand.','price_monthly'=>19999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>['sensa'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        ['id'=>'pack_futbol','type'=>'sensa_pack','public_name'=>'Pack Fútbol','description'=>'Viví todos los partidos de la liga argentina.','price_monthly'=>24999,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['pack_futbol'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        ['id'=>'pack_hbo','type'=>'sensa_pack','public_name'=>'Pack HBO','description'=>'Canales premium y acceso a la app MAX.','price_monthly'=>8999,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['pack_hbo'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        ['id'=>'pack_universal','type'=>'sensa_pack','public_name'=>'Universal+','description'=>'Canales premium y acceso a la app de streaming.','price_monthly'=>7999,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['pack_universal'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        ['id'=>'stb','type'=>'stb','public_name'=>'Set Top Box','description'=>'Convertí tu TV en Smart TV con Sensa y tus apps favoritas.','price_monthly'=>7750,'price_once'=>null,'currency'=>'ARS','requires'=>['sensa'],'excludes'=>['stb'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        ['id'=>'mesh','type'=>'mesh','public_name'=>'Wi-Fi Mesh','description'=>'Mejorá la cobertura Wi-Fi de tu hogar.','price_monthly'=>6999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>['mesh'],'enabled'=>true,'current_plans'=>[],'target_speed'=>null],
        // Speed offers require exact current Phantom plan labels and confirmed
        // existing-customer prices. They stay disabled until both are supplied.
        ['id'=>'internet_1000','type'=>'speed','public_name'=>'Internet 1000 Mbps','description'=>'Llevá tu conexión a la máxima velocidad.','price_monthly'=>54999,'price_once'=>null,'currency'=>'ARS','requires'=>[],'excludes'=>[],'enabled'=>false,'current_plans'=>[],'target_speed'=>1000],
    ],
    // HTTPS base containing LibreSpeed garbage.php/empty.php; never localhost.
    'speedtest_server' => null,
    // Global Wi-Fi compatibility. model_field remains null until the exact
    // Phantom field is confirmed by a controlled read-only inspection.
    // ONU_Modelo contains the chipset in the observed installation, not model.
    // SSID/SSID_5G/Password in JSON body; confirm this contract in the first trial.
    'wifi' => ['enabled'=>false, 'model_field'=>null, 'models'=>[], 'dual_band_models'=>[]],
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
