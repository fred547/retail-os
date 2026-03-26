#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

int main(int argc, char* argv[])
{
	char c;
	FILE* p;

	do
	{
		p = popen("java -cp \"lib/*\" org.posterita.client.Posterita", "r");
		if( p == NULL ) {
			fprintf(stderr, "Failed to execute shell with \"echo hello, world!\"");
			exit(1);
		}
		while( (c = fgetc(p)) != EOF ) {
			fputc(toupper(c), stdout);
		}
		pclose(p);

	}while(fopen("restart.flag","r") != 0);

	return EXIT_SUCCESS;
}

 
