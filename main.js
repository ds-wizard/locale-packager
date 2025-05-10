#!/usr/bin/env node

const archiver = require('archiver')
const commandLineArgs = require('command-line-args')
const fs = require('fs')
const path = require('path')
const po2json = require('@connectedcars/po2json')


class OutputWriter {
    constructor(output) {
        output = output || 'locale'

        if (path.isAbsolute(output)) {
            this.outputPath = output
        } else {
            this.outputPath = path.join(process.cwd(), output)
        }
    }

    async init() { }

    async addFile(content, name) { }

    async finalize() { }

    async _mkdirp(dirPath) {
        var dirname = path.dirname(dirPath);

        if (!fs.existsSync(dirname)) {
            await this._mkdirp(dirname);
        }

        if (!fs.existsSync(dirPath)) {
            await fs.promises.mkdir(dirPath)
        }
    }
}

class FolderOuptutWriter extends OutputWriter {
    async init() {
        await this._mkdirp(this.outputPath)
    }

    async addFile(content, name) {
        const filePath = path.join(this.outputPath, name)
        await this._mkdirp(path.dirname(filePath))
        await fs.promises.writeFile(filePath, content, 'utf8')
    }
}

class ZipOutputWriter extends OutputWriter {
    async init() {
        await this._mkdirp(path.dirname(this.outputPath))
        this.output = fs.createWriteStream(this.outputPath)
        this.archive = archiver('zip')
        this.archive.pipe(this.output)
    }

    async addFile(content, name) {
        this.archive.append(Buffer.from(content), { name })
    }

    async finalize() {
        this.archive.finalize()
    }
}


async function main() {
    try {
        const optionDefinitions = [
            { name: 'src', type: String, defaultOption: true },
            { name: 'out', type: String, alias: 'o' },
            { name: 'zip', type: Boolean, alias: 'z' }
        ]
        const options = commandLineArgs(optionDefinitions)

        // initialize output
        const outputClass = options.zip ? ZipOutputWriter : FolderOuptutWriter
        const output = new outputClass(options.out)
        await output.init()

        // locale source files
        const localeFolder = options.src

        // read PO files from the locale folder
        const localeFiles = await fs.promises.readdir(localeFolder)
        const poFiles = localeFiles.filter(file => file.endsWith('.po') && file !== 'mail.po')
        const mailPoFilePath = path.join(localeFolder, 'mail.po')
        const jsonFilePath = path.join(localeFolder, 'locale.json')
        const readmeFilePath = path.join(localeFolder, 'README.md')

        // convert each PO file (except mail) to JSON and add it to the zip file
        if (poFiles.length === 0) {
            console.warn(`No PO files found in ${localeFolder}.`)
        } else if (!poFiles.includes('wizard.po')) {
            console.warn(`wizard.po file not found in ${localeFolder}.`)
        }
        for (const poFile of poFiles) {
            const poFilePath = path.join(localeFolder, poFile)
            const poFileText = await fs.promises.readFile(poFilePath, { encoding: 'utf8' })
            const jsonData = po2json.parse(poFileText, { format: 'jed' })
            await output.addFile(JSON.stringify(jsonData), `locale/${poFile.replace('.po', '.json')}`)
        }

        // add mail PO file to the zip file (without conversion)
        if (!fs.existsSync(mailPoFilePath)) {
            console.warn(`Mail PO file not found at ${mailPoFilePath}.`)
        } else {
            const mailPoFileText = await fs.promises.readFile(mailPoFilePath, { encoding: 'utf8' })
            await output.addFile(mailPoFileText, 'locale/mail.po')
        }

        // load locale metadata and readme
        if (!fs.existsSync(jsonFilePath)) {
            console.error(`Locale JSON file not found at ${jsonFilePath}.`)
            return
        }
        const localeJsonText = await fs.promises.readFile(jsonFilePath, { encoding: 'utf8' })
        const localeJson = JSON.parse(localeJsonText)
        const readmeText = await fs.promises.readFile(readmeFilePath, { encoding: 'utf8' })

        // add extra metadata to locale JSON
        localeJson['id'] = `${localeJson['organizationId']}:${localeJson['localeId']}:${localeJson['version']}`
        localeJson['readme'] = readmeText
        localeJson['createdAt'] = new Date().toISOString()

        // add locale JSON to the zip file
        await output.addFile(JSON.stringify(localeJson), 'locale/locale.json')

        // finalize the zip archive
        await output.finalize()
    } catch (err) {
        console.error(err)
    }
}

main()
