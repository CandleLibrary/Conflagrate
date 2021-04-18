<h1 align=center>
    <img src="./flavor/cfw-flame-w-lib.svg" type="text/svg" rel="svg" height=80>
</h1>

<h3 align=center>Tree Traversal and Source Map Tools</h3>


<p align=center> <sub><b>v1.0.0</b></sub> </p>


Conflagrate bundles three common tasks when working with ASTs:
- Traversal (Walking)
- Rendering (Printing)
- Source Mapping

## Node Maps

Every system within Conflagrate utilizes a map structure that details specifies the layout
of nodes that a tree is comprised of. It is an object comprised of three properties:
#### NodeMapping

A `NodeMapping` provides information to Conflagrate on how to interact with a node of a given type. 
It can contain that type of the node, the properties of a node that should be checked for subnodes,
a formatting language that defines how node should be rendered to text, and 



#### NodeMappings

- `type_name` : This should be a `string` or a `symbol` that gives the property name of the node 
that specifier the type of the node.
- `type_lookup`: This is a function that returns the index of the mapping object for a given node
object. 
- `mappings`: This is an array of `NodeMapping` that provide

```
const node_mapping = {
    type_name: "type",
    type_lookup: ()=>0,
    mappings: ()=>{}

}
```

## Tree Traversal

This all starts with defining a mappings object that is used to define the characteristics
of data structures Conflagrate will encounter
```ts
//Given an AST that is comprised of these three nodes
interface Prototype  { type: string }

interface Root  extends Prototype { type:"root", expressions: EXP[]; }

interface EXP   extends Prototype { operator:string, left:EXP, right:EXP  }

interface Add   extends EXP { type:"ADD", operator:"+" }
interface Print extends EXP { type:"PRN", operator:"psh" }
interface Push  extends EXP { type:"PSH", operator:"_"  }    
interface Pop   extends EXP { type:"POP", operator:"^"  }    

type AST = Root | Add | Print | Push | Pop

//The mappings file can be made like this 
const mapping : NodeMapping = {
    typename: "type",
    type_lookup: (node, type)=>{

    },
}

```

### Yielders

This mappings object is then used to guide the various Conflagrate  utilities when 
operating on ASTs comprised of these nodes. 



## Rendering

```
import { render } from "@candlelib/conflagrate"



```

## Source Maps
Source mapping is provided automatically as long line and column information is available for a node. 
This can be provided in the form of properties `line` and `column` that are directly on the node, or
through a property object that has its own `line` and `column` properties.

### Format Language Syntax:
 - **Member Select** : `@<property name>([<index number>])?` - Set of
 - **Member Spread** : `@<property name>...([<any sequence of characters>])?` - 
 - **Literal** : `<any set of chracters>` - 
 - **Optional Newline** : `o:n` - 
 - **Mandatory Newline** : `m:n` - 
 - **Mandatory Space** : `m:s` - 
 - **Optional Space** : `o:s` - 
 - **Optional Flagged** : `{<property name>: rule+ }` - 

   Set of rules if the property the node is not `undefined` or `null` and, if its a container object, has a `size` or `length` greater than zero.
 - **Indent Start** : `i:s` - 
 - **Indent End** : `i:e` - 