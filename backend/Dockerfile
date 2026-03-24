# Use the official PHP 8.2 Apache image
FROM php:8.2-apache

# Enable Apache rewrite module so client-side routing works
RUN a2enmod rewrite

# Install the PDO MySQL extension for your database connection
RUN docker-php-ext-install pdo pdo_mysql

# Tell Apache that the true root of the website is the `public/` directory!
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Copy all the backend code directly into the container
COPY . /var/www/html/
