#!/bin/sh
echo "=========================================="
echo "🏠 家庭应用中心启动中..."
echo "=========================================="
echo ""
echo "服务列表:"
echo "  • Portal (门户):      http://localhost:8080"
echo "  • Parenting (育儿):   http://localhost:3000"
echo "  • Cello (大提琴):     http://localhost:3001"
echo ""
echo "=========================================="
exec /usr/bin/supervisord -c /etc/supervisord.conf
