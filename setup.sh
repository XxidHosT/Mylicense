#!/bin/bash

echo "=== License Bot VPS Setup ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install dependencies
npm install

# Setup .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "=== File .env sudah dibuat ==="
  echo "Edit file .env isi token dan URL:"
  echo "  nano .env"
  echo ""
fi

# Start bot dengan PM2
pm2 start index.js --name license-bot
pm2 save
pm2 startup

echo ""
echo "=== Setup selesai! ==="
echo "Cek status: pm2 status"
echo "Cek log: pm2 logs license-bot"
echo "Restart: pm2 restart license-bot"
