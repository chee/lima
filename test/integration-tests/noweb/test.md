# okay, here comes a test of the noweb syntax

```python name="printy"
	print(f"i am the {x}")
```

```python name="imports"
import sys
```

```python filename="./actual.py" shebang="#!/usr/bin/env python"
<<imports>>

for x in sys.argv:
	<<printy>>
```


```text name="dogs"
  albert
  johnny
  hoo-hoo
  pingu
```

```text name="cats"
  binugs
  nibgus
  bingus
  b0rk
  horky
  pepcarn
```

```text filename="actual.txt"
hello!

these are the dogs:
<<dogs>>

these are the cats:
<<cats>>
```
