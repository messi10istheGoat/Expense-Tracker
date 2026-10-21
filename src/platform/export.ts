import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
export async function exportFile(name: string, content: string, type: string) {
  if (Capacitor.isNativePlatform()) {
    const filename = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const file = await Filesystem.writeFile({
      path: `exports/${filename}`,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Share.share({ title: name, files: [file.uri], dialogTitle: 'Save or share your export' });
    // Export files live in the app cache; the OS may reclaim them. Save a copy through the share sheet.
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
