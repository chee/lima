# okay, here comes a test of the noweb syntax

```python name="printy"
	print(f"i am the {x}")
```

```python name="imports"
import sys
```

```python #!="/usr/bin/env python3", filename="./actual.py", expand=yes
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

```text filename="actual.txt", expand=yes
hello!

these are the dogs:
<<dogs>>

these are the cats:
<<cats>>
```
