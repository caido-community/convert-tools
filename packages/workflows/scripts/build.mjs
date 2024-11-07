// Get each definition.json file in the directories of the src folder
// Check if there is a node in the nodes array with the definition_id of "caido/code-js"
// If there is, get the alias of the node, and check if there is a file in the folder with the same name as the alias
// If there is, build the file using vitejs build API
// Copy the build output as code input for the node

import { build } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { builtinModules } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "..", "..", "dist");

/**
 * Builds a file using vitejs build API
 * @param {string} entrypoint - The path to the entrypoint file
 * @param {string} workflowDir - The path to the workflow directory
 * @returns {string} The path to the dist file
 */
const buildFile = async (entrypoint, workflowDir) => {
    const outDir = path.join(distDir, path.basename(workflowDir));

    await build({
        build: {
            lib: {
                entry: entrypoint,
                fileName: (_, entryName) => `${entryName}.js`,
                formats: ["es"],
            },
            outDir,
            rollupOptions: {
                external: [/caido:.+/, ...builtinModules],
                output: {
                    manualChunks: undefined,
                },
            },
        },
    });


    const fileName = path.basename(entrypoint).split(".")[0];
    return path.join(outDir, `${fileName}.js`);
}

/**
 * Read the workflow definition file of a workflow directory
 * @param {string} workflowDir - The path to the workflow directory
 * @returns {Object} The workflow definition
 */
const readWorkflowDefinition = (workflowDir) => {
    const definitionPath = path.join(rootDir, "src", workflowDir, "definition.json");
    try {
        return JSON.parse(fs.readFileSync(definitionPath, "utf8"));
    } catch (e) {
        throw new Error(`[!] Failed to read ${definitionPath}`);
    }
}

/**
 * Writes the updated workflow definition to the dist folder
 * @param {string} workflowDir - The path to the workflow directory
 * @param {Object} definition - The workflow definition
 */
const writeWorkflowDefinition = (workflowDir, definition) => {
    const distWorkflowDir = path.join(distDir, workflowDir);
    if (!fs.existsSync(distWorkflowDir)) {
        fs.mkdirSync(distWorkflowDir, { recursive: true });
    }

    const definitionPath = path.join(distWorkflowDir, "definition.json");
    fs.writeFileSync(definitionPath, JSON.stringify(definition, null, 2));
}

/**
 * Generates a "code" input for a Javascript node
 * @param {string} jsFile - The path to the JS file
 * @returns {Object} The "code" input
 */
const generateCodeInput = (jsFile) => {
    const code = fs.readFileSync(jsFile, "utf8");
    return {
        data: code,
        kind: "string",
    };
}

const workflowDirs = fs.readdirSync(path.join(rootDir, "src"));
console.log(`[*] Found ${workflowDirs.length} workflows`);

for (const workflowDir of workflowDirs) {
    console.log(`[*] Processing ${workflowDir} workflow`);

    const definition = readWorkflowDefinition(workflowDir);

    const jsNodes = definition.graph.nodes.filter((node) => node.definition_id === "caido/code-js");
    for (const jsNode of jsNodes) {
        console.log(`[*]    Processing "${jsNode.alias}" node`);
        const alias = jsNode.alias;
        const scriptPath = path.join(rootDir, "src", workflowDir, `${alias}.ts`);

        if (fs.existsSync(scriptPath)) {
            console.log(`[*]    Building ${scriptPath}`);
            const distFile = await buildFile(scriptPath, workflowDir);
            const codeInput = generateCodeInput(distFile);
            jsNode.inputs = jsNode.inputs.map((input) => {
                if (input.alias === "code") {
                    return codeInput;
                }

                return input;
            });
            fs.unlinkSync(distFile);
        } else {
            console.warn(`[!]    No external script at ${scriptPath}`);
        }
    }

    // Writing the updated definition.json file
    console.log(`[*]    Writing updated definition.json file`);
    writeWorkflowDefinition(workflowDir, definition);
}
