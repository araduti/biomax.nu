-- IngredientPin: editor-pinned cross-sells for /kop/[ingredient] landing pages.
CREATE TABLE "IngredientPin" (
  "id"             TEXT PRIMARY KEY,
  "ingredientSlug" TEXT NOT NULL,
  "productId"      TEXT NOT NULL,
  "position"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IngredientPin_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "IngredientPin_ingredientSlug_productId_key"
  ON "IngredientPin"("ingredientSlug", "productId");
CREATE INDEX "IngredientPin_ingredientSlug_position_idx"
  ON "IngredientPin"("ingredientSlug", "position");
