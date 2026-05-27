import os
import shutil
from pathlib import Path
from tqdm import tqdm

# ========================= CONFIG =========================
RAW_DATASET = Path("cropped_faces")          # ← your current raw folder
OUTPUT_FOLDER = Path("sorted_train")         # ← new clean structure

# The 3 folders you wanted inside "train"
IMAGES_DIR = OUTPUT_FOLDER / "images"           # 1. All static images (real + fake)
FAKE_VIDEOS_DIR = OUTPUT_FOLDER / "fake_videos" # 2. Fake videos only
REAL_VIDEOS_DIR = OUTPUT_FOLDER / "real_videos" # 3. Real videos only

def sort_dataset():
    # Create the new structure
    for folder in [IMAGES_DIR, FAKE_VIDEOS_DIR, REAL_VIDEOS_DIR]:
        folder.mkdir(parents=True, exist_ok=True)

    print(f"🔄 Sorting dataset from '{RAW_DATASET}' → '{OUTPUT_FOLDER}'")
    print("   Structure will be:")
    print(f"   ├── images/")
    print(f"   ├── fake_videos/")
    print(f"   └── real_videos/")

    processed = 0
    skipped = 0

    for root, dirs, files in os.walk(RAW_DATASET):
        # Skip backup and old split folders
        dirs[:] = [d for d in dirs if not d.startswith("_") and d.lower() not in ["train", "test", "val"]]

        root_path = Path(root)
        parent_name = root_path.name.lower()

        # Determine label for videos
        is_fake_video = "fake" in parent_name
        is_real_video = "real" in parent_name

        for file in tqdm(files, desc=f"Processing {root_path.name}", leave=False):
            file_path = root_path / file
            suffix = file_path.suffix.lower()

            try:
                if suffix in [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"]:
                    # 1. All images go into images/ folder
                    dest = IMAGES_DIR / file
                    shutil.copy2(file_path, dest)      # copy = safe (won't delete original)
                    processed += 1

                elif suffix in [".mp4", ".mov", ".avi", ".mkv"]:
                    if is_fake_video:
                        # 2. Fake videos
                        dest = FAKE_VIDEOS_DIR / file
                        shutil.copy2(file_path, dest)
                    elif is_real_video:
                        # 3. Real videos
                        dest = REAL_VIDEOS_DIR / file
                        shutil.copy2(file_path, dest)
                    else:
                        # fallback (unknown label)
                        dest = FAKE_VIDEOS_DIR / f"unknown_{file}"
                        shutil.copy2(file_path, dest)
                    processed += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"⚠️  Error copying {file}: {e}")
                skipped += 1

    # Final summary
    print("\n🎉 Sorting completed!")
    print(f"   Total files processed : {processed:,}")
    print(f"   Images                : {len(list(IMAGES_DIR.iterdir())):,}")
    print(f"   Fake videos           : {len(list(FAKE_VIDEOS_DIR.iterdir())):,}")
    print(f"   Real videos           : {len(list(REAL_VIDEOS_DIR.iterdir())):,}")
    print(f"   Skipped               : {skipped}")
    print(f"\n✅ New structure ready at: {OUTPUT_FOLDER.resolve()}")

if __name__ == "__main__":
    sort_dataset()