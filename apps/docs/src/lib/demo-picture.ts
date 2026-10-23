// The picture the File item's and the File upload's pages draw in their examples: the web package's own fixture
// picture, as bytes of the page (the same copy the web package's fixture documents inline), so that an example asks the
// site for no file.
import picture from '../../../../packages/web/test/fixtures/avatar.png?inline';

export const demoPicture: string = picture;
