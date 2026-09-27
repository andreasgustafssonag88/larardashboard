# Min nya lärardashboard

En installerbar webbapp med schemabild, dagens datum, digital klocka och öppningsbara anteckningsblock med checklistor.

## Publicera på GitHub Pages

1. Packa upp ZIP-filen.
2. Ladda upp **innehållet** i mappen till roten av ditt GitHub-repository.
3. Kontrollera att `index.html` ligger direkt i repositoryts rot.
4. Gå till **Settings > Pages**.
5. Välj **Deploy from a branch**, grenen **main** och mappen **/(root)**.
6. Spara och vänta tills GitHub Pages publicerat sidan.

## Uppdatera den tidigare dashboarden

Du kan ladda upp dessa filer till samma repository och ersätta de befintliga filerna. Den gamla kalendern försvinner då och ersätts av den nya dashboarden. Gamla kalenderuppgifter används inte av den nya versionen.

## Installera som app

Öppna webbadressen i Microsoft Edge och välj **... > Appar > Installera den här webbplatsen som en app**.

## Lagring

Anteckningsblock och checklistor sparas lokalt i webbläsaren. Schemabilden sparas i IndexedDB. Informationen finns kvar när fönstret stängs men synkroniseras inte automatiskt mellan enheter. Undvik känsliga elevuppgifter.
