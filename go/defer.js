// GO fmt package.
const fmt = {
  Println: (...params) => console.log(...params)
}

// GO defer emulation.
const deferFunction = (func) => {
  let stack = [];
  const defer = (fn) => stack.push(fn);
  func(defer);
  let call;
  while (call = stack.pop())
    call();
}

// GO source code.
/*
package main

import "fmt"

func main() {
	fmt.Println("counting")

	for i := 0; i < 10; i++ {
		defer fmt.Println(i)
	}

	fmt.Println("done")
}
*/

// Sysclone version.
function main() {
  deferFunction((defer) => {
    fmt.Println("counting")

    for (let i = 0; i < 10; i++) {
      defer(() => fmt.Println(i))
    }

    fmt.Println("done")
  })
}
