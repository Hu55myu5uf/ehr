<?php
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OpCache reset successfully.\n";
} else {
    echo "OpCache is not enabled.\n";
}
