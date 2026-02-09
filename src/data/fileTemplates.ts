import type { FileTemplate } from "../types";

export const FILE_TEMPLATES: FileTemplate[] = [
  {
    label: "HTML Document",
    extension: "html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  
</body>
</html>`,
  },
  {
    label: "CSS Stylesheet",
    extension: "css",
    content: `/* Stylesheet */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
`,
  },
  {
    label: "JavaScript",
    extension: "js",
    content: `"use strict";

function main() {
  console.log("Hello, world!");
}

main();
`,
  },
  {
    label: "TypeScript",
    extension: "ts",
    content: `function main(): void {
  console.log("Hello, world!");
}

main();
`,
  },
  {
    label: "React Component (TSX)",
    extension: "tsx",
    content: `import React from "react";

interface Props {
  // Define props here
}

const Component: React.FC<Props> = () => {
  return (
    <div>
      <h1>Component</h1>
    </div>
  );
};

export default Component;
`,
  },
  {
    label: "Python Script",
    extension: "py",
    content: `#!/usr/bin/env python3
"""Module docstring."""


def main():
    print("Hello, world!")


if __name__ == "__main__":
    main()
`,
  },
  {
    label: "Rust Source",
    extension: "rs",
    content: `fn main() {
    println!("Hello, world!");
}
`,
  },
  {
    label: "Shell Script",
    extension: "sh",
    content: `#!/bin/bash
set -euo pipefail

echo "Hello, world!"
`,
  },
  {
    label: "JSON File",
    extension: "json",
    content: `{
  
}
`,
  },
  {
    label: "YAML File",
    extension: "yaml",
    content: `# Configuration
`,
  },
  {
    label: "TOML File",
    extension: "toml",
    content: `# Configuration

[section]
key = "value"
`,
  },
  {
    label: "Markdown Document",
    extension: "md",
    content: `# Title

## Overview

Write your content here.
`,
  },
  {
    label: "C Source",
    extension: "c",
    content: `#include <stdio.h>

int main(void) {
    printf("Hello, world!\\n");
    return 0;
}
`,
  },
  {
    label: "C++ Source",
    extension: "cpp",
    content: `#include <iostream>

int main() {
    std::cout << "Hello, world!" << std::endl;
    return 0;
}
`,
  },
  {
    label: "Java Class",
    extension: "java",
    content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, world!");
    }
}
`,
  },
  {
    label: "Go Source",
    extension: "go",
    content: `package main

import "fmt"

func main() {
	fmt.Println("Hello, world!")
}
`,
  },
];
