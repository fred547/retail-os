#!/bin/sh

# set base directory
BASEDIR=$(dirname $0)
echo $BASEDIR

LIBDIR=$BASEDIR/lib/posterita.jar:$BASEDIR/lib/tools.jar
echo $LIBDIR

# goto base directory
cd $BASEDIR

# start posterita
echo "Starting posterita client ..."
java -cp "lib/*" org.posterita.client.Posterita

# set restart flag
file_name=restart.flag

while true; 
do
if [ -e "$file_name" ]
then
    # restart posterita
    echo "Restarting posterita client ..."
    java -cp "lib/*" org.posterita.client.Posterita    	
else    
    break
fi
done

echo "Exit APP"


