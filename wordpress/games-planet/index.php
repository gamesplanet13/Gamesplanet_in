<?php defined('ABSPATH') || exit; get_header(); ?>
<main class="section"><?php if (have_posts()) : while (have_posts()) : the_post(); ?>
<article <?php post_class(); ?>><h1 class="page-title"><?php the_title(); ?></h1><?php the_content(); ?></article>
<?php endwhile; else : ?><h1 class="page-title">Page not found</h1><a href="<?php echo esc_url(home_url('/')); ?>">Return to Games Planet</a><?php endif; ?></main>
<?php get_footer(); ?>