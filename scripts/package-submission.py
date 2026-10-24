from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
target=root/'output'/'CareRelay-Submission.zip'
excluded={'.git','node_modules','dist','.wrangler','.sites-runtime','.vinext','.next','.agents','.codex','__pycache__'}
with ZipFile(target,'w',ZIP_DEFLATED,strict_timestamps=False) as archive:
    for file in root.rglob('*'):
        rel=file.relative_to(root)
        if rel.parts[:2]==('output','presentation'): continue
        if not file.is_file() or any(p in excluded for p in rel.parts): continue
        if file==target or file.suffix in {'.zip','.gz','.tsbuildinfo'} or file.name.startswith('.env'): continue
        archive.write(file,Path('CareRelay')/rel)
print(f'Submission archive created: {target}')
