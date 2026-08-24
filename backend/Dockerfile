FROM php:8.2-fpm

# Installer Nginx et les dépendances
RUN apt-get update && apt-get install -y \
    nginx \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    libssl-dev \
    pkg-config \
    && docker-php-ext-install pdo pdo_mysql intl zip opcache \
    && rm -rf /var/lib/apt/lists/*

# Extension PHP MongoDB
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

# Copier les fichiers du projet
COPY . .

# Copier votre configuration Nginx existante
COPY docker/nginx.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# Installer les dépendances Symfony
ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Permissions pour le cache et les logs
RUN chown -R www-data:www-data /var/www/backend/var

EXPOSE 80

# Lancer PHP-FPM en arrière-plan et Nginx au premier plan
CMD php-fpm -D && nginx -g "daemon off;"