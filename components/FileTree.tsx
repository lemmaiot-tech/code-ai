import React, { useState, useMemo, useEffect } from 'react';
import { type GeneratedFile } from '../types';
import { FileIcon, FolderIcon, ChevronDownIcon, ChevronRightIcon } from './icons';

interface FileTreeProps {
  files: GeneratedFile[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
  isDirectory: boolean;
}

const buildTree = (files: GeneratedFile[]): TreeNode[] => {
  const root: TreeNode = { name: 'root', path: '', isDirectory: true, children: [] };

  files.forEach(file => {
    const pathParts = file.path.split('/');
    let currentNode = root;

    pathParts.forEach((part, index) => {
      const isDirectory = index < pathParts.length - 1;
      const path = pathParts.slice(0, index + 1).join('/');

      let childNode = currentNode.children?.find(child => child.path === path);

      if (!childNode) {
        childNode = {
          name: part,
          path,
          isDirectory,
          ...(isDirectory && { children: [] }),
        };
        currentNode.children?.push(childNode);
      }
      
      currentNode = childNode;
    });
  });
  
  // Sort so folders come before files
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
    });
    nodes.forEach(node => {
        if (node.children) {
            sortNodes(node.children);
        }
    });
  };
  
  if (root.children) {
    sortNodes(root.children);
    return root.children;
  }

  return [];
};

export const FileTree: React.FC<FileTreeProps> = ({ files, selectedPath, onSelect }) => {
  const tree = useMemo(() => buildTree(files), [files]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  // Automatically expand the 'src' directory if it exists
  useEffect(() => {
    const srcNode = tree.find(node => node.name === 'src' && node.isDirectory);
    if (srcNode) {
      setExpandedDirs(prev => new Set(prev).add(srcNode.path));
    }
  }, [tree]);

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);

    if (node.isDirectory) {
      return (
        <div key={node.path}>
          <button
            onClick={() => toggleDirectory(node.path)}
            style={{ paddingLeft: `${depth * 1}rem` }}
            className="w-full flex items-center text-left p-1 rounded-md text-sm text-on-surface-secondary hover:bg-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            <FolderIcon />
            <span className="font-medium">{node.name}</span>
          </button>
          {isExpanded && node.children && (
            <div className="pl-2">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // It's a file
    return (
      <button
        key={node.path}
        onClick={() => onSelect(node.path)}
        style={{ paddingLeft: `${depth * 1.5}rem` }}
        className={`w-full flex items-center text-left p-1 rounded-md text-sm transition-colors ${
          selectedPath === node.path
            ? 'bg-primary/20 text-on-surface'
            : 'text-on-surface-secondary hover:bg-gray-700'
        }`}
      >
        <FileIcon />
        {node.name}
      </button>
    );
  };

  return <div className="space-y-1">{tree.map(node => renderNode(node, 0))}</div>;
};
