Pirate Arr-PC
=============

Pirate RPC is a framework for implementing session-oriented remote procedure APIs. It is suited very well for building service-to-service WebSocket interfaces.

![They be more like guidelines](docs/images/guidelines.gif)

[Detailed documentation is available on the repository's GitHub Pages site](https://jmanero.github.io/pirate)

### Adding Documentation Pages

Add markdown files to `docs/_pages`. Files must have a `frontmatter` header with, at least, the following attributes:

```
---
layout: default
title: Documentation
icon: tags
order: 200
---
```

* `icon` is the [Font Awesome] icon that will be used in the generated navigation pane
* `order` defines the sorting behavior of pages in the generated navigation pane

Pages are rendered by Jekyll and can include [Liquid template] tags and filters.

[Font Awesome]: http://fontawesome.io/icons/
[Liquid template]: https://jekyllrb.com/docs/templates/
