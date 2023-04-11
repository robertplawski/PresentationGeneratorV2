import React, {useEffect} from 'react';
import {TextButton, LinkButton} from "../../components/buttons";
import {IconDownload} from "@tabler/icons-react"
import axios from "axios";

export default function PresentationViewer(props) {
  const {presentation} = props;
  let presentationUri ="/api/export/pptx/"+presentation._id 

  return (
    <>
      <section className="p-0 flex justify-center h-screen items-center flex-wrap-reverse overflow-auto flex-col gap-8">
        <p className="text-6xl font-bold">Your presentation is done!</p>
        <iframe className="w-full h-auto aspect-[16/9.5] flex " src={`https://view.officeapps.live.com/op/embed.aspx?src=${location.origin+presentationUri}`}/>
        <LinkButton href={presentationUri} className="border-black border-2 p-3">
          <IconDownload/>Download your presentation!
        </LinkButton>
      </section>
    </>
  );
}
