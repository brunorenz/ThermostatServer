#
PID=/share/NODE/MainServer.pid


pidFile=$(ls $PID|head -1)

if [ -z "${pidFile}" ]; then
  echo File $PID non esiste
else
  read -r pid < $PID
  task=$(ps -ef | grep $pid | grep MainServer |head -1)
  if [ "${task}" ]; then 
    echo Kill task $pid
    kill $pid
  else
    echo Task $pid found but is not MainServer
  fi
fi

