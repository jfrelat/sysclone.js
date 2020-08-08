# sysclone.js
JavaScript compatibility layer for old operating systems (MsDos) and programming languages (Quick Basic, Turbo Pascal, inline x86 assembly and C).

# What is it?
This is an experimental and *proof-of-concept* project to automatically transpile and help porting games and applications written in old programming languages (Quick Basic, Turbo Pascal, inline X86 assembly and C) and originally running on old operating systems (MsDos) to the Web, thanks to the JavaScript language and all HTML5 APIs.

# Why?
According to Jeff Atwood's law:
> Any application that can be written in JavaScript, will eventually be written in JavaScript.

# How it works?
sysclone.js rely on the strengthes of the JavaScript language itself and its evolutions (ES6, ES7, ES8...) to mimic as much as possible the innerworkings of the original source code.
A virtual machine (VM) emulates the system requirements (keyboard, mouse, VGA card, memory, x86 CPU...).
This project focuses more on the compatibility rather than the performance, by cloning as most as possible the original source code of the application into its JavaScript translation.

# What about Emscripten, asm.js or WASM (Web Assembly) ?
These solutions are low-level, fast and accurate ways to port C/C++ programs to the Web. However they rely on a low-level language (LLVM) or bytecode (WASM) and are more dedicated to modern software porting.
There are technical challenges to compile and run successfully Quick Basic, Turbo Pascal or C programs interleaved with inline x86 assembly, that go beyond these solutions.
