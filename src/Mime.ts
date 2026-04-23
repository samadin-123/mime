type TypeMap = { [key: string]: string[] };

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end
    this.cache.set(key, value);
    // Evict oldest if over size
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
}

export default class Mime {
  #extensionToType = new Map<string, string>();
  #typeToExtension = new Map<string, string>();
  #typeToExtensions = new Map<string, Set<string>>();
  #pathCache = new LRUCache<string, string>(100);

  constructor(...args: TypeMap[]) {
    for (const arg of args) {
      this.define(arg);
    }
  }

  /**
   * Define mimetype -> extension mappings.  Each key is a mime-type that maps
   * to an array of extensions associated with the type.  The first extension is
   * used as the default extension for the type.
   *
   * e.g. mime.define({'audio/ogg', ['oga', 'ogg', 'spx']});
   *
   * If a mapping for an extension has already been defined an error will be
   * thrown unless the `force` argument is set to `true`.
   *
   * e.g. mime.define({'audio/wav', ['wav']}, {'audio/x-wav', ['*wav']});
   */
  define(typeMap: TypeMap, force = false) {
    for (let [type, extensions] of Object.entries(typeMap)) {
      // Lowercase thingz
      type = type.toLowerCase();
      extensions = extensions.map((ext) => ext.toLowerCase());

      if (!this.#typeToExtensions.has(type)) {
        this.#typeToExtensions.set(type, new Set<string>());
      }
      const allExtensions = this.#typeToExtensions.get(type);

      let first = true;
      for (let extension of extensions) {
        const starred = extension.startsWith('*');

        extension = starred ? extension.slice(1) : extension;

        // Add to list of extensions for the type
        allExtensions?.add(extension);

        if (first) {
          // Map type to default extension (first in list)
          this.#typeToExtension.set(type, extension);
        }
        first = false;

        // Starred types are not eligible to be the default extension
        if (starred) continue;

        // Map extension to type
        const currentType = this.#extensionToType.get(extension);
        if (currentType && currentType != type && !force) {
          throw new Error(
            `"${type} -> ${extension}" conflicts with "${currentType} -> ${extension}". Pass \`force=true\` to override this definition.`,
          );
        }
        this.#extensionToType.set(extension, type);
      }
    }

    return this;
  }

  /**
   * Get mime type associated with an extension
   */
  getType(path: string) {
    if (typeof path !== 'string') return null;

    // Check cache first
    const cached = this.#pathCache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    // Remove chars preceding `/` or `\`
    const last = path.replace(/^.*[/\\]/s, '').toLowerCase();

    // Remove chars preceding '.'
    const ext = last.replace(/^.*\./s, '').toLowerCase();

    const hasPath = last.length < path.length;
    const hasDot = ext.length < last.length - 1;

    // Extension-less file?
    if (!hasDot && hasPath) {
      this.#pathCache.set(path, null as any);
      return null;
    }

    const result = this.#extensionToType.get(ext) ?? null;
    this.#pathCache.set(path, result as any);
    return result;
  }

  /**
   * Get default file extension associated with a mime type
   */
  getExtension(type: string) {
    if (typeof type !== 'string') return null;

    // Remove http header parameter(s) (specifically, charset)
    type = type?.split?.(';')[0];

    return (
      (type && this.#typeToExtension.get(type.trim().toLowerCase())) ?? null
    );
  }

  /**
   * Get all file extensions associated with a mime type
   */
  getAllExtensions(type: string) {
    if (typeof type !== 'string') return null;

    return this.#typeToExtensions.get(type.toLowerCase()) ?? null;
  }

  //
  // Private API, for internal use only.  These APIs may change at any time
  //

  _freeze() {
    this.define = () => {
      throw new Error('define() not allowed for built-in Mime objects. See https://github.com/broofa/mime/blob/main/README.md#custom-mime-instances');
    };

    Object.freeze(this);

    for (const extensions of this.#typeToExtensions.values()) {
      Object.freeze(extensions);
    }

    return this;
  }

  _getTestState() {
    return {
      types: this.#extensionToType,
      extensions: this.#typeToExtension,
    };
  }
}
