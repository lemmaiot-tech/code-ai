
import { type FigmaImport } from '../types';

// Helper function to prune the massive Figma JSON to only include relevant properties for the AI
const pruneFigmaNode = (node: any): any => {
    if (!node) return null;

    const relevantKeys = [
        // --- Core Properties ---
        'id',
        'name',
        'type',

        // --- Bounding Box & Transform ---
        'absoluteBoundingBox',
        'clipsContent', // Corresponds to overflow: hidden
        'opacity',

        // --- Auto Layout Properties ---
        'layoutMode', // HORIZONTAL | VERTICAL -> flex-direction
        'layoutWrap', // WRAP | NO_WRAP -> flex-wrap
        'layoutAlign', // -> align-self
        'layoutGrow', // -> flex-grow
        'layoutPositioning', // AUTO | ABSOLUTE -> position
        'primaryAxisSizingMode', // HUG | FIXED -> width/height behavior
        'counterAxisSizingMode', // HUG | FIXED -> width/height behavior
        'primaryAxisAlignItems', // -> justify-content
        'counterAxisAlignItems', // -> align-items
        'itemSpacing', // -> gap
        'paddingLeft',
        'paddingRight',
        'paddingTop',
        'paddingBottom',

        // --- Constraints (for non-Auto Layout) ---
        'constraints',

        // --- Fill & Stroke Properties ---
        'fills', // Fills array -> background
        'strokes', // Strokes array -> border
        'strokeWeight', // -> border-width
        'strokeAlign', // INSIDE | OUTSIDE | CENTER
        
        // --- Corner Radius ---
        'cornerRadius', // A single value for all corners
        'rectangleCornerRadii', // Individual values [topLeft, topRight, bottomRight, bottomLeft]

        // --- Effects & Blend Mode ---
        'effects', // Drop shadows, inner shadows, blurs
        'blendMode',

        // --- Text Properties ---
        'characters',
        'fontName',
        'fontWeight',
        'fontSize',
        'textAlignHorizontal',
        'textAlignVertical',
        'letterSpacing',
        'lineHeight',
        'textCase', // UPPER, LOWER, TITLE -> text-transform
        'textDecoration', // STRIKETHROUGH, UNDERLINE

        // --- Design System ---
        'style', // Contains IDs for styles (color, text, effect)
    ];

    const pruned: { [key: string]: any } = {};
    for (const key of relevantKeys) {
        if (node[key] !== undefined) {
            pruned[key] = node[key];
        }
    }

    if (node.children && node.children.length > 0) {
        pruned.children = node.children.map(pruneFigmaNode);
    }
    
    return pruned;
}

const parseFigmaUrl = (url: string): { fileKey: string; nodeId: string } | null => {
    // This regex is more robust, captures the file key until the next slash.
    const regex = /figma\.com\/(?:file|design)\/([^\/]+)\/.*?node-id=([^&]+)/;
    const match = url.match(regex);
    if (match && match[1] && match[2]) {
      let nodeId = decodeURIComponent(match[2]);
      // Figma URLs often use a hyphen '-' as a separator in node IDs instead of a colon ':'.
      // The Figma API requires the colon format (e.g., "123:45"). We perform a simple
      // replacement of the first hyphen to handle the common "123-45" format found in URLs.
      nodeId = nodeId.replace('-', ':');
      return { fileKey: match[1], nodeId };
    }
    return null;
  };

/**
 * Fetches design data (image and JSON) from the Figma API.
 * @param figmaUrl - The full Figma URL with a node-id.
 * @param figmaToken - The user's Figma Personal Access Token.
 * @returns A promise that resolves to a FigmaImport object.
 */
export const fetchFigmaData = async (figmaUrl: string, figmaToken: string): Promise<FigmaImport & { preview: string }> => {
    const parsedUrl = parseFigmaUrl(figmaUrl);
    if (!parsedUrl) {
      throw new Error('Invalid Figma URL. Please use a URL with a "node-id" (e.g., by selecting a frame and using the "Share" link).');
    }

    const { fileKey, nodeId } = parsedUrl;
    const encodedNodeId = encodeURIComponent(nodeId);
    
    // --- OPTIMIZATION: Run API calls in parallel ---
    // Fetch the image URL and the node JSON simultaneously for better performance.

    // 1. Get the image URL from Figma API.
    const figmaImageUrlApi = `https://api.figma.com/v1/images/${fileKey}?ids=${encodedNodeId}&format=png&scale=2`;
    const imagePromise = fetch(figmaImageUrlApi, {
      headers: { 'X-Figma-Token': figmaToken },
    }).then(async (res) => {
        if (!res.ok) throw new Error(`Figma API Error (Images): ${res.status} ${await res.text()}`);
        return res.json();
    });

    // 2. Fetch the JSON data for the specific node (more efficient than fetching the whole file)
    const figmaNodeApiUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodedNodeId}`;
    const nodePromise = fetch(figmaNodeApiUrl, {
      headers: { 'X-Figma-Token': figmaToken },
    }).then(async (res) => {
        if (!res.ok) throw new Error(`Figma API Error (Nodes): ${res.status} ${await res.text()}`);
        return res.json();
    });

    const [imageData, nodeData] = await Promise.all([imagePromise, nodePromise]);

    // Process image response
    // The key in the 'images' object from the API response is the decoded node ID.
    if (imageData.err || !imageData.images || !imageData.images[nodeId]) {
      throw new Error('Could not retrieve image from Figma. Check your URL, token, and permissions.');
    }
    const imageUrl = imageData.images[nodeId];

    // Process node response
    const targetNode = nodeData.nodes?.[nodeId]?.document;
    if (!targetNode) {
        throw new Error('Could not find the specified node-id in the Figma file.');
    }
    const prunedNode = pruneFigmaNode(targetNode);

    // 3. Fetch the image itself (cannot be parallelized as it depends on imageUrl)
    const imageBlobResponse = await fetch(imageUrl);
    if (!imageBlobResponse.ok) throw new Error('Failed to download the rendered image from Figma.');
    const blob = await imageBlobResponse.blob();
    const file = new File([blob], "figma-design.png", { type: blob.type });

    // 4. Convert to base64 and return the complete data structure
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const base64String = result.split(',')[1];
            resolve({
                image: { file, base64: base64String },
                node: prunedNode,
                preview: result,
            });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
