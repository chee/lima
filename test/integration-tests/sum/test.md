# hello!

this is a test

## here's a code block:
it's part of a c++ file

```c++ filename="actual.cc", name="sum"
#include <vector>
#include <iostream>
using namespace std;

int sum (std::vector<int> numbers) {
	int result = 0;
	for (auto i : numbers) {
		result += i;
	}
	return result;
}
```

## here's some more

```c++ filename="actual.cc", name="main"
int main () {
  cout << "hello!" << endl;
  return 0;
}
```

this is a very smol script

```sh filename="actual.sh", #!="/bin/sh"
ls
```
