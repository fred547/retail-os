@echo off
set basedir=%~dp0
echo %basedir%
cd  %basedir%

echo Starting Posterita ...

:RESTART
java -cp "lib/*" org.posterita.client.Posterita

if exist "restart.flag" (
	echo Restarting Posterita ...
	GOTO RESTART
)

echo Exiting Posterita ..