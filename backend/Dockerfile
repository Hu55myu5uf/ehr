# Use the official PHP 8.2 Apache image
FROM php:8.2-apache

# Enable Apache rewrite and headers modules
RUN a2enmod rewrite headers

# Install the PDO MySQL extension and other dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo pdo_mysql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Tell Apache that the true root of the website is the `public/` directory!
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copy all the backend code directly into the container
COPY . /var/www/html/

# Run composer install to generate the vendor folder
RUN composer install --no-interaction --optimize-autoloader
