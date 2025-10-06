# Análise - Filtros Hierárquicos de Localização

## Requisito
- Utilizar o arquivo locations.json em front/data/locations.json para filtros de localização
- Implementar lógica hierárquica:
  - Se país não especificado: considerar todos os locais
  - Se país especificado mas estado não: incluir todo o território do país
  - Aplicar lógica hierárquica para todos os níveis

## Implementação Necessária
1. Verificar se existe o arquivo locations.json
2. Integrar os dados do arquivo na lógica de filtros
3. Implementar filtros hierárquicos (país > estado > cidade)
4. Atualizar a interface de filtros para usar os dados estruturados
5. Manter performance e responsividade

## Localização
- Arquivo: Recordes.jsx
- Seção: Filtros de localização e função applyFilters