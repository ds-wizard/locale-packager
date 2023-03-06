# DSW Locale Packager

[![Node.js Package CI](https://github.com/ds-wizard/locale-packager/workflows/Node.js%20Package/badge.svg)](https://github.com/ds-wizard/locale-packager/actions)
[![npm version](https://badge.fury.io/js/@ds-wizard%2Flocale-packager.svg)](https://badge.fury.io/js/@ds-wizard%2Flocale-packager)
[![License](https://img.shields.io/github/license/ds-wizard/locale-packager)](LICENSE)


DSW Locale Packager is a command line tool for creating locale packages for the [Data Stewardship Wizard](https://ds-wizard.org).


## Instalation

```bash
$ npm install @ds-wizard/locale-packager
```

## Usage

Once the tool is installed, it can be used as follows:

```
$ npx dsw-locale-packager <source folder>
```

The source folder should contain the following files, as in for example [here](https://github.com/ds-wizard/wizard-client-locales/tree/v3.20.1/locales/cs):

- `README.md`
- `locale.json`
- `locale.po`

## License

This project is licensed under the Apache License v2.0 - see the
[LICENSE](LICENSE) file for more details.