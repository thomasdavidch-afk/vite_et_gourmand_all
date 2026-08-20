FROM php:8.2-fpm

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libicu-dev \
    libzip-dev \
    libssl-dev \
    pkg-config \
    && docker-php-ext-install pdo pdo_mysql intl zip opcache

# Installer l'extension PHP MongoDB via PECL et l'activer
RUN pecl install mongodb \
    && docker-php-ext-enable mongodb

# Installer Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

# Copier les fichiers du projet
COPY . .

# Installer les dépendances Symfony
RUN composer install --no-interaction --optimize-autoloader

EXPOSE 9000

CMD ["php-fpm"]