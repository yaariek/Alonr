# Hall photos

Add one JPEG photo per hall to this folder. Name each file with the hall's property slug (the normalized hall name from `properties.csv`):

```text
<property-slug>.jpg
```

For example, save the photo for **Chapter King's Cross** as:

```text
public/images/halls/chapter-king-s-cross.jpg
```

The slug is made by lowercasing the hall name and replacing every run of non-letter/number characters with a hyphen. Keep the spelling from `properties.csv`; the photo will appear automatically on that hall's map popup, Search card, and detail page. If no matching photo exists, the existing Search artwork and detail placeholder remain visible.

Use `.jpg` filenames. To add or replace photos on the live site, include the files in your next Git push.
