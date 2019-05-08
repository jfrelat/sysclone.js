# sysclone.js
JavaScript compatibility layer for operating systems and programming languages

# What is it?
This is an experimental and *proof-of-concept* project to ease the porting of games and applications written in different programming languages and originally running on different operating systems to the Web, thanks to the JavaScript language and all HTML5 APIs.

# Why?
According to Jeff Atwood's law:
> Any application that can be written in JavaScript, will eventually be written in JavaScript.

# How it works?
sysclone.js rely on the strengthes of the JavaScript language itself and its evolutions (ES6, ES7, ES8...).
This project focuses not on performance but rather on cloning as most as possible the original source code of the application into its JavaScript translation, keeping the original code indentation, style, comments. Of course, the final code may be optimized, minified or whatever but this is 100% pure JavaScript in the end.

# Any examples?

```go
package main

import "fmt"

func main() {
	fmt.Println("counting")

	for i := 0; i < 10; i++ {
		defer fmt.Println(i)
	}

	fmt.Println("done")
}
```
would be syscloned into
```javascript

```
