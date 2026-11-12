// The blog's posts as the site reads them from its collection (src/content.config.ts, `blog`): each with its language
// and name from its file's path (lib/blog.ts, `postOf`), its author the repository's owner where it names none, and
// the entry the post's page renders. Read once a build.
import { getCollection, type CollectionEntry } from 'astro:content';
import { owner, postOf, type Post } from './blog';

export type BlogPost = Post & { entry: CollectionEntry<'blog'> };

/** Where the collection's files are, relative to the docs' root (the loader's `base`). */
const BASE = 'src/content/blog/';

let read: Promise<BlogPost[]> | undefined;

/** Every post, in every language it is written in. */
export function blogPosts(): Promise<BlogPost[]> {
  read ??= getCollection('blog').then((entries) =>
    entries.map((entry) => {
      const file = (entry.filePath ?? '').replace(/\\/g, '/');
      if (!file.startsWith(BASE)) throw new Error(`blog: the post ${entry.id} is not under ${BASE} (${file})`);
      const { dir, slug } = postOf(file.slice(BASE.length));
      return { dir, slug, entry, data: { title: entry.data.title, description: entry.data.description, date: entry.data.date, author: entry.data.author ?? owner } };
    }),
  );
  return read;
}
