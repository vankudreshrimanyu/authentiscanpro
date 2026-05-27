import os, shutil, random, time
from pathlib import Path

# === CONFIG ===
DATA_ROOT = r"E:\ddeepfake-detector\cropped_faces"
SPLIT = (0.8, 0.1, 0.1)  # train / val / test
SEED = 42
USE_HARDLINK = True  # set False to copy if you prefer

random.seed(SEED)

def video_key_from_name(name: str) -> str:
    """
    Derive video ID from filename.
    Example:
      '000_frame0025_face.jpg'     -> '000'
      '000_003_frame0100_face.jpg' -> '000_003'
    Rule: take everything before the first '_frame'.
    """
    base = os.path.splitext(os.path.basename(name))[0]
    if "_frame" in base:
        return base.split("_frame")[0]
    return base  # fallback

def gather_by_video(class_dir: Path):
    """
    Returns dict: {video_key: [list of file paths]} for a class directory.
    """
    files = [p for p in class_dir.glob("*") if p.suffix.lower() in [".jpg",".jpeg",".png"]]
    groups = {}
    for p in files:
        key = video_key_from_name(p.name)
        groups.setdefault(key, []).append(p)
    return groups

def safe_link_or_copy(src: Path, dst: Path):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists():
        return
    if USE_HARDLINK:
        try:
            os.link(src, dst)  # fast, no admin needed on NTFS
            return
        except Exception:
            pass
    shutil.copy2(src, dst)

def main():
    root = Path(DATA_ROOT)
    real_dir = root / "real"
    fake_dir = root / "fake"

    assert real_dir.exists() and fake_dir.exists(), "Expected 'real' and 'fake' folders in cropped_faces"

    # 1) Group frames by video-id per class
    real_groups = gather_by_video(real_dir)
    fake_groups = gather_by_video(fake_dir)
    print(f"Found {len(real_groups)} real videos, {len(fake_groups)} fake videos.")

    # 2) Split video-ids (by groups), not frames
    def split_keys(keys):
        keys = list(keys)
        random.shuffle(keys)
        n = len(keys)
        n_train = int(SPLIT[0]*n)
        n_val   = int(SPLIT[1]*n)
        return {
            "train": keys[:n_train],
            "val":   keys[n_train:n_train+n_val],
            "test":  keys[n_train+n_val:]
        }

    splits = {
        "real": split_keys(real_groups.keys()),
        "fake": split_keys(fake_groups.keys())
    }

    # 3) Backup old split if exists
    for part in ["train","val","test"]:
        d = root / part
        if d.exists():
            backup = root / f"_{part}_backup_{int(time.time())}"
            print(f"Backing up existing '{part}' -> '{backup.name}'")
            d.rename(backup)

    # 4) Materialize the split (copy/link frames)
    for label, groups in [("real", real_groups), ("fake", fake_groups)]:
        for part, keys in splits[label].items():
            for key in keys:
                for src in groups[key]:
                    dst = root / part / label / src.name
                    safe_link_or_copy(src, dst)

    # 5) Sanity checks: ensure each video-id appears in only ONE split
    def check_leakage(label, groups, split_map):
        where = {}
        leak = []
        for part, keys in split_map.items():
            for k in keys:
                if k in where:
                    leak.append((k, where[k], part))
                else:
                    where[k] = part
        if leak:
            print(f"[LEAK WARNING] {label}: same video in multiple splits:", leak[:5])
        else:
            print(f"[OK] No leakage detected for '{label}'")

    check_leakage("real", real_groups, splits["real"])
    check_leakage("fake", fake_groups, splits["fake"])

    # 6) Print counts
    def count_images(d):
        p = root / d
        total = 0
        for label in ["real","fake"]:
            q = p / label
            c = len([x for x in q.glob("*") if x.suffix.lower() in [".jpg",".jpeg",".png"]]) if q.exists() else 0
            print(f"{d.upper():5s} | {label:4s}: {c:6d}")
            total += c
        print(f"{d.upper():5s} | total: {total:6d}")

    print("\n=== New split (video-level) ===")
    for part in ["train","val","test"]:
        count_images(part)

    print("\nDone. Re-run your training script; it will pick up the new train/val/test.")

if __name__ == "__main__":
    main()
