# sysclone.js
JavaScript compatibility layer for operating systems and languages

# What is it?
This is an experimental and *proof-of-concept* project to ease the porting of games and applications written in different languages and originally running on different operating systems to the Web, thanks to the JavaScript language and all HTML5 APIs.

For example, a game or application written in the C language that compiles on MS-DOS thanks to DJGPP could be translated automatically or semi-automatically to the JavaScript language. DJGPP features (libc or POSIX calls), VGA display, keyboard input would exist as a high-level JavaScript and HTML5 API compatibility layer.

# Is this possible?
Yes, actually this project is similar to Emscripten or CheerpJS projects. They compile C or C++ code in the low-level intermediate language [LLVM](https://en.wikipedia.org/wiki/LLVM), and then transpile LLVM to the JavaScript language. To achieve better performance, they also generate asm.js code and now WebAssembly code. So native code transpiled to the Web at near native speed!
However, this looks like this is the death of the ubiquitous JavaScript. This is a just a matter of time and efforts before we can see Java bytecode or C# JIT running at near native speed on the Web.
According to Jeff Atwood's law:
> Any application that can be written in JavaScript, will eventually be written in JavaScript.

It looks like this is not anymore true with WebAssembly.

As a number of applications, games and libraries were successfully ported from C/C++ to the Web and JavaScript, thanks to Emscripten, this means alternatives like sysclone.js are possible in the JavaScript language.

# Why this is different?
sysclone.js rely on the strengthes of the JavaScript language itself and its evolutions (ES6, ES7, ES8...). Instead of allocating memory heap and stack like Emscripten, we can allocate typed arrays, create objects for C structs, turn synchronous and blocking code into asynchronous code with async/await...
This project focuses not on performance but rather on cloning as most as possible the original source code of the application into its JavaScript translation, keeping the original code indentation, style, comments. Of course, the final code may be optimized, minified or whatever but this is 100% pure JavaScript in the end.

# What are the goals?
sysclone.js could support many source languages and simulate many operating systems, using either high-level or low-level library implementations.
* Supported languages for example : C, C++, Java, Swift, Python, PHP, C#...
* Supported OS for example : MS-DOS, Windows, Linux, SunOS, MacOS...
* Supported features : VGA display, terminal sound, keyboard, mouse, gamepad...
* Supported libraries : DJGPP, Allegro, SDL, libc, POSIX...

# Any examples?

```java
// Hello World in Java

class HelloWorld {
  static public void main( String args[] ) {
    System.out.println( "Hello World!" );
  }
}
```
would be translated into
```javascript
// Hello World in Java

class HelloWorld {
  static main( args ) {
    System.out.println( "Hello World!" );
  }
}
```

