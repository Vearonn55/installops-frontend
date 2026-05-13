#!/usr/bin/env bash
# Add photo upload + media serving to nginx for kurulum.alplerltd.com
set -euo pipefail

CONF="${1:-/etc/nginx/sites-available/installops-frontend.conf}"

if [[ ! -f "$CONF" ]]; then
  echo "Config not found: $CONF" >&2
  exit 1
fi

cp "$CONF" "${CONF}.bak.$(date +%Y%m%d%H%M%S)"

if ! grep -q 'client_max_body_size' "$CONF"; then
  sed -i '/server_name kurulum.alplerltd.com;/a\
\
    client_max_body_size 20M;' "$CONF"
  echo "Added client_max_body_size 20M"
else
  echo "client_max_body_size already present"
fi

if ! grep -q 'location \^~ /media/' "$CONF"; then
  awk '
    /location \^~ \/api\// { in_api=1 }
    in_api && /^[[:space:]]*}[[:space:]]*$/ && !done {
      print
      print ""
      print "    # Crew checklist photos (Node serves src/uploads)"
      print "    location ^~ /media/ {"
      print "        proxy_pass http://127.0.0.1:8000;"
      print "        proxy_http_version 1.1;"
      print "        proxy_set_header Host              $host;"
      print "        proxy_set_header X-Real-IP         $remote_addr;"
      print "        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;"
      print "        proxy_set_header X-Forwarded-Proto $scheme;"
      print "        proxy_connect_timeout 120s;"
      print "        proxy_send_timeout 120s;"
      print "        proxy_read_timeout 120s;"
      print "    }"
      done=1
      in_api=0
      next
    }
    { print }
  ' "$CONF" > "${CONF}.tmp" && mv "${CONF}.tmp" "$CONF"
  echo "Added /media/ location"
else
  echo "/media/ location already present"
fi

nginx -t
systemctl reload nginx
echo "Nginx reloaded OK"
