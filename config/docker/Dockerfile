FROM debian:buster as common

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update -q && \
    apt-get install -qqy --no-install-recommends wget apt-transport-https lsb-release ca-certificates

RUN wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg && \
    echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list

RUN apt-get update -q && apt-get install -qqy --no-install-recommends --fix-missing \
    pv \
    vim \
    nano \
    less \
    unzip \
    php8.1-pcov \
    php8.1-cli \
    php8.1-fpm \
    php8.1-memcached \
    php8.1-intl \
    php8.1-mysql \
    php8.1-mbstring \
    php8.1-curl \
    php8.1-xml \
    libxml2 \
    php8.1-zip \
    php8.1-soap \
    php8.1-imagick \
    nginx \
    memcached \
    ssl-cert \
    wget \
    git \
    patch \
    jq \
    htop \
    curl \
    net-tools \
    iptables \
    telnet \
    sudo \
    optipng \
    msmtp \
    procps \
    # Explicitly install libpcre2-8-0 to workaournd packaging bug
    # https://github.com/oerdnj/deb.sury.org/issues/1682
    libpcre2-8-0 \
    gettext \
    p7zip \
    openssh-client \
    locales \
    && apt-get clean && rm -r /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

RUN sed -i -e 's/# \(de_DE\.UTF-8 .*\)/\1/' /etc/locale.gen && locale-gen

RUN sed -i 's/worker_processes auto;/worker_processes 2;/g' /etc/nginx/nginx.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN /usr/bin/composer config --global process-timeout 0

RUN groupadd jigsawlutionermachine
RUN useradd -m -g jigsawlutionermachine --shell /bin/bash jigsawlutionermachine && \
    echo "jigsawlutionermachine ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

RUN mkdir -p /home/jigsawlutionermachine/shared/php_temp/system_temp /home/jigsawlutionermachine/shared/php_temp/upload_temp && \
    chown -R jigsawlutionermachine:jigsawlutionermachine /home/jigsawlutionermachine/shared/php_temp/

RUN rm /etc/php/8.1/fpm/pool.d/www.conf && \
    mkdir -p /run/php && \
    mkdir -p /var/log/php8.1-fpm/jigsawlutionermachine && \
    ln -s /home/jigsawlutionermachine/current/config/docker/php-fpm/pool-jigsawlutionermachine.conf /etc/php/8.1/fpm/pool.d/pool-jigsawlutionermachine.conf && \
    ln -s /home/jigsawlutionermachine/current/config/docker/nginx/jigsawlutionermachine.conf /etc/nginx/sites-enabled/jigsawlutionermachine.conf && \
    \
    rm /etc/nginx/sites-enabled/default && \
    ln -s /home/jigsawlutionermachine/current/config/docker/php/custom.ini /etc/php/8.1/cli/conf.d/custom.ini && \
    ln -s /home/jigsawlutionermachine/current/config/docker/php/custom.ini /etc/php/8.1/fpm/conf.d/custom.ini

RUN usermod -G jigsawlutionermachine www-data

CMD sudo nginx && \
  sudo /etc/init.d/memcached start && \
  sudo php-fpm8.1 && \
  tail -f /dev/null

USER jigsawlutionermachine:jigsawlutionermachine
WORKDIR /home/jigsawlutionermachine/current

FROM common as dev

USER root

RUN apt-get update -q && apt-get install -qqy --fix-missing --no-install-recommends \
    php8.1-xdebug \
    && apt-get clean && rm -r /var/lib/apt/lists/*

RUN rm /etc/php/8.1/fpm/conf.d/20-xdebug.ini && \
    rm /etc/php/8.1/cli/conf.d/20-xdebug.ini && \
    ln -s /home/jigsawlutionermachine/current/config/docker/php/xdebug_fpm.ini /etc/php/8.1/fpm/conf.d/20-xdebug.ini && \
    ln -s /home/jigsawlutionermachine/current/config/docker/php/xdebug_cli.ini /etc/php/8.1/cli/conf.d/20-xdebug.ini

USER jigsawlutionermachine:jigsawlutionermachine
