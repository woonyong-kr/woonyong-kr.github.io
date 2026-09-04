---
layout: default
title: Runnable Code Blocks
parent: UI Components
nav_order: 8
---

# Runnable Code Blocks

This comparison page keeps four ordinary reference snippets and four examples
that run only after selecting **Run**. Browser examples run in a sandbox;
Kotlin and Python are sent to the named public execution provider.

## Static reference snippets

```yaml
site:
  theme: just-the-docs
  search_enabled: true
```

```java
record Document(String title, boolean published) {}
```

```sql
select title from documents where published = true;
```

```scss
.main-content {
  max-width: 50rem;
}
```

## Executable examples

```run-javascript
const sections = ["Navigation", "Search", "Code"];
console.log(`${sections.length} documented components`);
```

```run-typescript
type Theme = "light" | "dark";
const systemTheme: Theme = "dark";
console.log(`system theme: ${systemTheme}`);
```

```run-kotlin
fun main() {
    val sections = listOf("Navigation", "Search", "Code")
    println("${sections.size} documented components")
}
```

```run-python
sections = ["Navigation", "Search", "Code"]
print(f"{len(sections)} documented components")
```

The source Markdown remains unchanged after execution. A failed or timed-out
remote run does not retry through another provider because the remote outcome
may be unknown.
