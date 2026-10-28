<?php
/** Games Planet storefront support. */
defined('ABSPATH') || exit;
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('woocommerce');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
});
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('games-planet', get_stylesheet_uri(), array(), '1.5.1');
    if (!is_front_page() && !(function_exists('is_product') && is_product())) { return; }
    wp_enqueue_script('gp-hero', get_template_directory_uri() . '/hero-data.js', array(), '1.0.0', true);
    wp_enqueue_script('gp-postal', get_template_directory_uri() . '/postal.js', array(), '1.1.0', true);
    wp_add_inline_script('gp-postal', 'window.GP_NATIVE_POSTAL=true;', 'before');
    wp_enqueue_script('gp-delivery', get_template_directory_uri() . '/delivery.js', array('gp-postal'), '1.1.0', true);
    wp_enqueue_script('gp-setup-data', get_template_directory_uri() . '/setup-data.js', array(), '1.5.1', true);
    wp_enqueue_script('gp-setup-engine', get_template_directory_uri() . '/setup-engine.js', array('gp-setup-data'), '1.5.1', true);
    wp_enqueue_script('gp-checkout', get_template_directory_uri() . '/checkout.js', array('gp-setup-engine'), '1.5.1', true);
    wp_enqueue_script('gp-policies', get_template_directory_uri() . '/policies-data.js', array(), '1.3.0', true);
    wp_enqueue_script('gp-store', get_template_directory_uri() . '/app.js', array('gp-hero', 'gp-delivery', 'gp-checkout', 'gp-policies'), '1.5.1', true);
    $base = trailingslashit(get_template_directory_uri());
    $catalog = json_decode(file_get_contents(get_template_directory() . '/catalog.json'), true);
    // The bundled snapshot is replaced by editable WooCommerce products only after
    // the store owner explicitly enables it; partial imports never hide the snapshot.
    if (get_theme_mod('gp_use_woocommerce', false) && function_exists('wc_get_products')) {
        $catalog = array();
        $items = wc_get_products(array('status' => 'publish', 'limit' => -1, 'orderby' => 'menu_order', 'order' => 'ASC', 'type' => array('simple', 'variable', 'external')));
        foreach ($items as $item) {
            if (!$item->is_visible() || !$item->is_in_stock()) { continue; }
            $pics = array();
            foreach (array_merge(array($item->get_image_id()), $item->get_gallery_image_ids()) as $aid) {
                $url = wp_get_attachment_image_url($aid, 'large');
                if ($url) { $pics[] = esc_url_raw($url); }
            }
            $variants = array(); $prices = array(); $weights = array();
            if ($item->is_type('variable')) {
                foreach ($item->get_children() as $child_id) {
                    $child = wc_get_product($child_id);
                    if (!$child || !$child->is_in_stock() || !$child->is_purchasable()) { continue; }
                    $variant = implode(' / ', array_values($child->get_attributes()));
                    if (!$variant) { $variant = (string) $child_id; }
                    $variants[] = $variant;
                    $prices[$variant] = (float) wc_get_price_to_display($child);
                    $weights[$variant] = (float) wc_get_weight($child->get_weight() ?: 0, 'g');
                }
                if (!$variants) { continue; }
            }
            $features = array_values(array_filter(array_map('trim', preg_split('/\R+/', wp_strip_all_tags($item->get_description(), true)))));
            $entry = array(
                'id' => (string) ($item->get_sku() ?: 'wc-' . $item->get_id()),
                'name' => $item->get_name(),
                'url' => get_permalink($item->get_id()),
                'price' => $item->is_type('variable') ? min($prices) : (float) wc_get_price_to_display($item),
                'category' => 'Games Planet',
                'shopPage' => $item->get_meta('gp_shop_page') ?: 'gaming',
                'images' => $pics, 'features' => $features,
                'weight' => (float) wc_get_weight($item->get_weight() ?: 0, 'g'),
                'variants' => $variants, 'variantPrices' => $prices, 'variantWeights' => $weights,
                'customType' => $item->get_meta('gp_custom_type'),
                'optionalSelector' => $item->get_meta('gp_selector_url'),
                'topGamesVideo' => $item->get_meta('gp_video_url')
            );
            $dims = array($item->get_length(), $item->get_width(), $item->get_height());
            if (count(array_filter($dims)) === 3) {
                $entry['dimensions'] = array_map(function ($d) { return (float) wc_get_dimension($d, 'cm'); }, $dims);
            }
            $catalog[] = $entry;
        }
    }
    // Preserve console groups, free storage-matched games and the complete PS2 flow in WooCommerce mode.
    $bundle_catalog = json_decode(file_get_contents(get_template_directory() . '/catalog.json'), true);
    $bundle_by_id = array();
    foreach ($bundle_catalog as $bundle) { $bundle_by_id[$bundle['id']] = $bundle; }
    foreach ($catalog as &$entry) {
        $bundle = isset($bundle_by_id[$entry['id']]) ? $bundle_by_id[$entry['id']] : null;
        if (!$bundle) { continue; }
        foreach (array('shopPages', 'consoleOrder', 'includedOnly', 'includedGames', 'gamesListUrl', 'optionalAddons', 'arcadeType', 'systemModes', 'variantDetails', 'shipping', 'tvOptions', 'includedTV') as $key) {
            if (array_key_exists($key, $bundle)) { $entry[$key] = $bundle[$key]; }
        }
        if (!empty($bundle['includedGames']) || !empty($bundle['arcadeType'])) {
            foreach (array('features', 'keyFeatures', 'fullDescription', 'description', 'notes', 'boxContents', 'technicalTable') as $key) {
                if (isset($bundle[$key])) { $entry[$key] = $bundle[$key]; }
            }
        }
        if (!empty($bundle['includedGames'])) { $entry['images'] = $bundle['images']; }
        if (!empty($bundle['includedOnly'])) { $entry['price'] = 0; }
        if (isset($bundle['customType']) && $bundle['customType'] === 'ps2') { $entry['url'] = 'https://gamesplanet13.github.io/ps2/'; }
    }
    unset($entry);
    $initial_product = '';
    if (function_exists('is_product') && is_product() && function_exists('wc_get_product')) {
        $viewed = wc_get_product(get_queried_object_id());
        if ($viewed) { $initial_product = (string) ($viewed->get_sku() ?: 'wc-' . $viewed->get_id()); }
    }
    wp_add_inline_script('gp-store', 'window.GP_INITIAL_PRODUCT=' . wp_json_encode($initial_product) . ';window.GP_ACCOUNT_URL=' . wp_json_encode(function_exists('wc_get_page_permalink') ? wc_get_page_permalink('myaccount') : '') . ';window.GP_ASSET_BASE=' . wp_json_encode($base) . ';window.GP_CATALOG=' . wp_json_encode($catalog, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';', 'before');
});
add_action('customize_register', function ($customizer) {
    $customizer->add_section('gp_catalog_section', array('title' => 'Games Planet catalog', 'priority' => 30));
    $customizer->add_setting('gp_use_woocommerce', array('default' => false, 'sanitize_callback' => function ($value) { return (bool) $value; }));
    $customizer->add_control('gp_use_woocommerce', array('type' => 'checkbox', 'section' => 'gp_catalog_section', 'label' => 'Use WooCommerce products', 'description' => 'Enable only after the full product CSV import is complete. Otherwise the bundled GitHub catalog is displayed. This storefront uses a WhatsApp enquiry bag, separate from WooCommerce checkout.'));
});

add_filter('template_include', function ($template) {
    if (get_theme_mod('gp_use_woocommerce', false) && function_exists('is_product') && is_product()) {
        return get_template_directory() . '/front-page.php';
    }
    return $template;
});
