# Sudoku Photo Solver

[Use the live site](https://yildirim-emre.github.io/sudoku-photo-solver/) · English · [Türkçe](#türkçe) · [Deutsch](#deutsch) · [Português (Portugal)](#português-portugal) · [Português (Brasil)](#português-brasil)

A mobile-friendly Sudoku photo reader and solver. Take a picture or select a saved image, review the detected digits in an editable 9×9 grid, and solve it. The solution stays hidden until you tap an individual empty square for a hint or choose **Reveal all**. If the scan misses or misreads a digit, correct it in the grid before solving. You can also enter a puzzle manually.

## Use

1. Open the [site](https://yildirim-emre.github.io/sudoku-photo-solver/) on a phone or computer.
2. Take or choose a clear photo with the whole square 9×9 grid visible. Tap **Scan photo**.
3. Check every detected clue, tapping squares to fix any mistakes. Tap **Solve puzzle**.
4. Tap one hidden square for a hint, or **Reveal all** for the complete table.
5. Select English, Türkçe, Deutsch, Português (PT), or Português (BR) from the language menu. The choice is saved on this device.

The scanner uses OpenCV.js for grid detection and Tesseract.js for digit recognition. Recognition can make mistakes, especially with angled or blurry photos; always check the grid. A puzzle with multiple solutions is labeled accordingly.

## Privacy

Your selected photo and puzzle are processed locally in your browser. **The application does not upload, save, or collect the photo or puzzle data.** The photo remains in browser memory until you clear it, replace it, or close the page. Only your language preference is saved in browser local storage. On first scan, the browser downloads OCR worker, core, and English recognition data from jsDelivr and Project Naptha CDNs; those providers can see normal network request metadata, but the photo is not sent to them. GitHub Pages may keep standard web access logs. There are no accounts, analytics, or application server.

## Develop and deploy

Requires Node.js 22.13 or newer. Run `npm install`, then `npm run dev`. Run `npm run typecheck` and `npm run build` before deploying. This is a static Vite/React app. On pushes to `main`, the GitHub Actions workflow builds the site and deploys `dist` to GitHub Pages. The Vite `base` defaults to `/sudoku-photo-solver/`; set `GITHUB_PAGES_BASE` if the repository name changes. In repository **Settings → Pages**, select **GitHub Actions** as the build source if it is not enabled automatically. No environment variables or backend secrets are required.

## Türkçe

Fotoğraftan Sudoku okuyan ve çözen, telefonda da çalışan bir site. [Siteyi açın](https://yildirim-emre.github.io/sudoku-photo-solver/), fotoğraf çekin veya seçin, **Fotoğrafı tara** düğmesine basın. Algılanan rakamları kontrol edip karelere dokunarak düzeltin; ardından **Bulmacayı çöz** düğmesine basın. Çözüm başlangıçta gizlidir: bir kareye dokunarak tek ipucu alın veya **Tümünü göster** seçeneğini kullanın. Dil menüsünden Türkçe seçilebilir. Fotoğraf ve bulmaca tarayıcınızda işlenir; uygulama bunları yüklemez, saklamaz veya toplamaz. OCR dosyaları harici CDN'lerden indirilir; GitHub standart erişim kayıtları tutabilir.

## Deutsch

Eine mobil nutzbare Website, die Sudoku-Fotos liest und löst. [Website öffnen](https://yildirim-emre.github.io/sudoku-photo-solver/), Foto aufnehmen oder auswählen und **Foto scannen** drücken. Erkannte Zahlen prüfen und bei Bedarf durch Antippen korrigieren; dann **Sudoku lösen** drücken. Die Lösung bleibt zunächst verborgen: Ein Feld antippen, um einen Hinweis zu sehen, oder **Alles aufdecken** wählen. Deutsch lässt sich im Sprachmenü auswählen. Foto und Rätseldaten werden im Browser verarbeitet; die App lädt, speichert oder sammelt sie nicht. OCR-Dateien werden von externen CDNs geladen; GitHub kann übliche Zugriffsprotokolle führen.

## Português (Portugal)

Um site para telemóvel que lê e resolve Sudokus a partir de fotografias. [Abre o site](https://yildirim-emre.github.io/sudoku-photo-solver/), tira ou escolhe uma fotografia e carrega em **Digitalizar fotografia**. Confirma os números detetados e toca nas casas para os corrigir; depois carrega em **Resolver puzzle**. A solução começa oculta: toca numa casa para uma dica ou escolhe **Revelar tudo**. Seleciona Português (PT) no menu de idiomas. A fotografia e o puzzle são processados no navegador; a aplicação não os envia, guarda nem recolhe. Os ficheiros OCR vêm de CDNs externos; o GitHub pode registar acessos normais.

## Português (Brasil)

Um site para celular que lê e resolve Sudokus a partir de fotos. [Abra o site](https://yildirim-emre.github.io/sudoku-photo-solver/), tire ou escolha uma foto e toque em **Ler foto**. Confira os números detectados e toque nas casas para corrigir; depois toque em **Resolver Sudoku**. A solução começa oculta: toque em uma casa para ver uma dica ou escolha **Revelar tudo**. Selecione Português (BR) no menu de idiomas. A foto e o Sudoku são processados no navegador; o aplicativo não os envia, armazena nem coleta. Arquivos de OCR vêm de CDNs externos; o GitHub pode registrar acessos comuns.

## License

[MIT](LICENSE) © 2026 Emre Yildirim.
