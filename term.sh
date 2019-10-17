#

rm /share/NODE/MainServer.pid

nohup node /share/NODE/ThermServer/MainServer.js &
echo $! >>/share/NODE/MainServer.pid
