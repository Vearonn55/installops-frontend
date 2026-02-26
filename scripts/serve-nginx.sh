#!/bin/bash
#
# serve-nginx.sh — Install, start, and serve nginx on a VDS/VPS
# Usage: sudo bash serve-nginx.sh [install|start|stop|restart|status|enable]
#        Or:   sudo ./scripts/serve-nginx.sh install  (from project root)
#

set -e

NGINX_SERVICE="nginx"
ACTION="${1:-install}"

# Detect package manager
detect_pkg_manager() {
  if command -v apt-get &>/dev/null; then
    echo "apt"
  elif command -v dnf &>/dev/null; then
    echo "dnf"
  elif command -v yum &>/dev/null; then
    echo "yum"
  else
    echo "unknown"
  fi
}

install_nginx() {
  local pkg
  pkg=$(detect_pkg_manager)
  case "$pkg" in
    apt)
      apt-get update
      apt-get install -y nginx
      ;;
    dnf|yum)
      $pkg install -y nginx
      ;;
    *)
      echo "Unsupported package manager. Install nginx manually."
      exit 1
      ;;
  esac
  echo "Nginx installed."
}

enable_nginx() {
  if command -v systemctl &>/dev/null; then
    systemctl enable "$NGINX_SERVICE"
    echo "Nginx enabled to start on boot."
  else
    echo "systemctl not found; enable nginx via your init system."
  fi
}

start_nginx() {
  if command -v systemctl &>/dev/null; then
    systemctl start "$NGINX_SERVICE"
    echo "Nginx started."
  else
    service "$NGINX_SERVICE" start 2>/dev/null || nginx
    echo "Nginx started."
  fi
}

stop_nginx() {
  if command -v systemctl &>/dev/null; then
    systemctl stop "$NGINX_SERVICE"
    echo "Nginx stopped."
  else
    service "$NGINX_SERVICE" stop 2>/dev/null || nginx -s stop
    echo "Nginx stopped."
  fi
}

restart_nginx() {
  if command -v systemctl &>/dev/null; then
    systemctl restart "$NGINX_SERVICE"
    echo "Nginx restarted."
  else
    service "$NGINX_SERVICE" restart 2>/dev/null || (nginx -s reload 2>/dev/null || true)
    echo "Nginx restarted."
  fi
}

status_nginx() {
  if command -v systemctl &>/dev/null; then
    systemctl status "$NGINX_SERVICE"
  else
    service "$NGINX_SERVICE" status 2>/dev/null || (pgrep -a nginx || echo "Nginx process not found.")
  fi
}

open_firewall() {
  if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 'Nginx Full' 2>/dev/null || (ufw allow 80/tcp && ufw allow 443/tcp)
    ufw reload
    echo "Firewall: Nginx (80, 443) allowed."
  elif command -v firewall-cmd &>/dev/null && systemctl is-active firewalld &>/dev/null; then
    firewall-cmd --permanent --add-service=http --add-service=https
    firewall-cmd --reload
    echo "Firewall: http/https opened."
  else
    echo "No ufw/firewalld active; ensure ports 80 and 443 are open if needed."
  fi
}

case "$ACTION" in
  install)
    if ! command -v nginx &>/dev/null; then
      install_nginx
      enable_nginx
      open_firewall
    fi
    start_nginx
    status_nginx
    ;;
  start)   start_nginx ;;
  stop)    stop_nginx ;;
  restart) restart_nginx ;;
  status)  status_nginx ;;
  enable)  enable_nginx ;;
  firewall) open_firewall ;;
  *)
    echo "Usage: $0 {install|start|stop|restart|status|enable|firewall}"
    echo "  install  - Install nginx (if needed), enable, open firewall, start"
    echo "  start    - Start nginx"
    echo "  stop     - Stop nginx"
    echo "  restart  - Restart nginx"
    echo "  status   - Show nginx status"
    echo "  enable   - Enable nginx to start on boot"
    echo "  firewall - Open ports 80/443 (ufw or firewalld)"
    exit 1
    ;;
esac
