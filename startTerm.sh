#

thermPath=/home/bruno/software/node
rm ${thermPath}/MainServer.pid

nohup nodejs ${thermPath}/ThermServer/MainServer.js &
echo $! >>${thermPath}/MainServer.pid
