content = open('web/app.js', encoding='utf-8').read()

# Read the actual dash character from file
idx = content.find('add specific references')
dash = content[idx - 3]
print(f'Dash char: {repr(dash)}, ord: {ord(dash)}')

# Build old/new using extracted dash so encoding matches exactly
old1 = f'`"${{companyName}}" not mentioned {dash} add specific references.`'
new1 = f'`"${{escapeHtml(companyName)}}" not mentioned {dash} add specific references.`'
print(f'old1 in content: {old1 in content}')
content = content.replace(old1, new1, 1)

old2 = f'`"${{companyName}}" mentioned once {dash} a second specific reference strengthens the letter.`'
new2 = f'`"${{escapeHtml(companyName)}}" mentioned once {dash} a second specific reference strengthens the letter.`'
print(f'old2 in content: {old2 in content}')
content = content.replace(old2, new2, 1)

old3 = f'`"${{companyName}}" mentioned ${{mentions}} times {dash} good specificity.`'
new3 = f'`"${{escapeHtml(companyName)}}" mentioned ${{mentions}} times {dash} good specificity.`'
print(f'old3 in content: {old3 in content}')
content = content.replace(old3, new3, 1)

open('web/app.js', 'w', encoding='utf-8').write(content)
print('Done.')
